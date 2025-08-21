
'use server';
/**
 * @fileOverview A flow for generating creative anonymous usernames.
 *
 * - generateUsername - A function that generates a username based on an image title.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateUsernameInputSchema = z.string();
const GenerateUsernameOutputSchema = z.string();

export async function generateUsername(imageTitle: string): Promise<string> {
    return usernameFlow(imageTitle);
}

const prompt = ai.definePrompt({
    name: 'usernamePrompt',
    input: { schema: GenerateUsernameInputSchema },
    output: { schema: GenerateUsernameOutputSchema },
    prompt: `You are a creative naming expert.
      Based on the provided image title, generate a fun, two-word, anonymous-style username for the person who uploaded it.
      The username should be evocative of the image's content or theme.
      For example, if the title is "Sunset over the ocean", a good username would be "Ocean Gazer" or "Sunset Chaser".
      If the title is "Cat in a sunbeam", a good username would be "Sunbeam Cuddler" or "Feline Friend".
      Return only the generated username, with no extra text or quotation marks.

      Image Title: {{{input}}}`,
});

const usernameFlow = ai.defineFlow(
    {
        name: 'usernameFlow',
        inputSchema: GenerateUsernameInputSchema,
        outputSchema: GenerateUsernameOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output || "Anonymous Artist";
    }
);
