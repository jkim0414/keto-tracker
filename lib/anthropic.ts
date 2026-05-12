import Anthropic from "@anthropic-ai/sdk";

export function getAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export type ParsedFoodItem = {
  name: string;
  netCarbsG: number;
  servingDescription?: string;
  confidence: "high" | "medium" | "low";
  notes?: string;
};

const SYSTEM_PROMPT = `You are a nutrition assistant specializing in ketogenic diet tracking.
Given a user's description of what they ate (text or image), identify each distinct food item and estimate the NET CARBS in grams for each.

Net carbs = total carbohydrates - dietary fiber - sugar alcohols.

Rules:
- Return ONE entry per distinct food item (don't lump unrelated foods together).
- If quantity is given, scale accordingly. If not, assume a typical single serving.
- Whole, unprocessed proteins (eggs, plain meat, fish) and pure fats (butter, olive oil) have ~0g net carbs - use 0.
- Non-starchy vegetables: low net carbs (e.g., 1 cup spinach ~0.4g, 1 cup broccoli ~3.6g).
- Be honest about uncertainty via the confidence field.
- Use "high" confidence only for clearly identifiable, standard items with stated quantity.
- Use "low" when portion size is ambiguous or the item is hard to identify.

Return ONLY a JSON object matching the schema. No prose, no markdown fences.`;

const FOOD_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Concise food name with quantity if known" },
          netCarbsG: { type: "number", description: "Estimated net carbs in grams" },
          servingDescription: { type: "string", description: "e.g. '2 large eggs', '1 cup'" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          notes: { type: "string", description: "Optional caveat about the estimate" },
        },
        required: ["name", "netCarbsG", "confidence"],
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
