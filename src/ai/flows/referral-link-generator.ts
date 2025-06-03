// src/ai/flows/referral-link-generator.ts
'use server';

/**
 * @fileOverview Generates a referral link and suggested text for sharing the UroTrack app.
 *
 * - generateReferralLink - A function that generates the referral link and text.
 * - GenerateReferralLinkInput - The input type for the generateReferralLink function.
 * - GenerateReferralLinkOutput - The return type for the generateReferralLink function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReferralLinkInputSchema = z.object({
  appUrl: z
    .string()
    .url()
    .describe('The URL of the UroTrack app to be shared.'),
});
export type GenerateReferralLinkInput = z.infer<
  typeof GenerateReferralLinkInputSchema
>;

const GenerateReferralLinkOutputSchema = z.object({
  referralText: z
    .string()
    .describe(
      'A suggested message, with a shortened link, that the user can copy and paste to share the app with others.'
    ),
});
export type GenerateReferralLinkOutput = z.infer<
  typeof GenerateReferralLinkOutputSchema
>;

export async function generateReferralLink(
  input: GenerateReferralLinkInput
): Promise<GenerateReferralLinkOutput> {
  return generateReferralLinkFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReferralLinkPrompt',
  input: {schema: GenerateReferralLinkInputSchema},
  output: {schema: GenerateReferralLinkOutputSchema},
  prompt: `You are a marketing expert who is good at creating referral messages.

  The user wants to share the following app with their friends and family:
  App URL: {{{appUrl}}}

  Create a short message, with a shortened link (if possible), that the user can copy and paste to share the app with others.
  The app is called UroTrack and helps patients track their recovery after prostatectectomy.  The message should explain the purpose of the app.
  Do not use emojis.  Do not use hashtags.
`,
});

const generateReferralLinkFlow = ai.defineFlow(
  {
    name: 'generateReferralLinkFlow',
    inputSchema: GenerateReferralLinkInputSchema,
    outputSchema: GenerateReferralLinkOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
