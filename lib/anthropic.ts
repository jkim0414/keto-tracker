import Anthropic from "@anthropic-ai/sdk";

export function getAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export type ParsedFoodItem = {
  name: string;
  servings: number;
  netCarbsPerServingG: number;
  servingDescription: string;
  confidence: "high" | "medium" | "low";
  notes?: string;
};

const SYSTEM_PROMPT = `You are a nutrition assistant specializing in ketogenic diet tracking.
Given a user's description of what they ate (text or image), identify each distinct food item and estimate the NET CARBS.

CRITICAL FORMATTING RULE — output one ATOMIC SERVING per item, with a separate quantity count:
  - "servings" = the integer (or fractional) count of how many of that atomic unit were eaten
  - "servingDescription" = describes ONE atomic unit, written with a leading "1 " (e.g. "1 sausage", "1 large egg", "1 cup", "1 tbsp", "1 slice (30 g)")
  - "netCarbsPerServingG" = net carbs in a single atomic unit

Examples:
  - Photo shows two sausages → { servings: 2, servingDescription: "1 sausage", netCarbsPerServingG: 1.0 }
    NOT { servings: 1, servingDescription: "2 sausages", netCarbsPerServingG: 2.0 }
  - "three eggs scrambled" → { servings: 3, servingDescription: "1 large egg", netCarbsPerServingG: 0.4 }
  - "a tablespoon of butter" → { servings: 1, servingDescription: "1 tbsp", netCarbsPerServingG: 0 }
  - "half an avocado" → { servings: 0.5, servingDescription: "1 medium avocado", netCarbsPerServingG: 3.6 }
  - "1 cup spinach" → { servings: 1, servingDescription: "1 cup", netCarbsPerServingG: 0.4 }

NET CARBS calculation (critical for keto):
  net carbs = total carbohydrates
            − dietary fiber
            − erythritol (subtract 100%, not metabolized)
            − allulose (subtract 100%, not metabolized)
            − other sugar alcohols (xylitol, sorbitol, maltitol, isomalt, glycerin: subtract 100%)

Many low-carb / keto products (Halo Top, Quest bars, Lily's chocolate, ChocZero, keto ice cream)
contain large amounts of erythritol or allulose. If a label says "22g carbs, 8g fiber, 12g erythritol",
net carbs are 2g, not 14g or 22g. If you only know the brand, use typical formulations.

Rules:
- Return ONE entry per distinct food item (don't lump unrelated foods together).
- Whole, unprocessed proteins (eggs, plain meat, fish) and pure fats (butter, olive oil) have ~0g.
- Non-starchy vegetables are low (1 cup spinach ~0.4g, 1 cup broccoli ~3.6g).
- "high" confidence only for clearly identifiable, standard items with stated quantity.
- "low" when portion size is ambiguous or the item is hard to identify.
- In notes, flag any sugar-alcohol assumption the user might dispute.

Return ONLY a JSON object matching the schema. No prose, no markdown fences.`;

const FOOD_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Concise food name without quantity (e.g. 'Sausage', 'Avocado')",
          },
          servings: {
            type: "number",
            description: "How many atomic servings were eaten. Use decimals for partial (0.5).",
          },
          servingDescription: {
            type: "string",
            description:
              "Describes ONE atomic serving with a leading '1' (e.g. '1 sausage', '1 large egg', '1 cup', '1 tbsp')",
          },
          netCarbsPerServingG: {
            type: "number",
            description: "Net carbs in ONE atomic serving, in grams",
          },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          notes: { type: "string", description: "Optional caveat about the estimate" },
        },
        required: [
          "name",
          "servings",
          "servingDescription",
          "netCarbsPerServingG",
          "confidence",
        ],
      },
    },
  },
  required: ["items"],
};

export async function parseFoodFromText(text: string): Promise<ParsedFoodItem[]> {
  const client = getAnthropicClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not set");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "log_foods",
        description: "Log identified food items with net carb estimates",
        input_schema: FOOD_SCHEMA as never,
      },
    ],
    tool_choice: { type: "tool", name: "log_foods" },
    messages: [{ role: "user", content: text }],
  });

  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "log_foods") {
      const input = block.input as { items: ParsedFoodItem[] };
      return input.items || [];
    }
  }
  return [];
}

export async function parseFoodFromImage(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  caption?: string
): Promise<ParsedFoodItem[]> {
  const client = getAnthropicClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not set");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "log_foods",
        description: "Log identified food items with net carb estimates",
        input_schema: FOOD_SCHEMA as never,
      },
    ],
    tool_choice: { type: "tool", name: "log_foods" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: caption
              ? `What is in this photo? Additional context from user: ${caption}`
              : "What food items are in this photo? Estimate net carbs for each.",
          },
        ],
      },
    ],
  });

  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "log_foods") {
      const input = block.input as { items: ParsedFoodItem[] };
      return input.items || [];
    }
  }
  return [];
}
