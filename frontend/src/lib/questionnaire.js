export const QUESTIONNAIRE = [
  { id: 'image_threat', tag: 'sextortion', label: 'Coercion involving private images', question: 'Did anyone threaten to share or publish private or intimate images?', helper: 'A threat is different from an image that has already been shared.' },
  { id: 'image_shared', tag: 'image_misuse', label: 'Image shared without consent', question: 'Do you have evidence that an intimate image was actually shared without consent?', helper: 'Choose “Not sure” if the messages only threaten to share it.' },
  { id: 'continued_contact', tag: 'stalking', label: 'Repeated unwanted contact', question: 'Did unwanted contact continue after you clearly asked them to stop?', helper: 'A single refusal alone does not establish repeated contact.' },
  { id: 'impersonation', tag: 'impersonation', label: 'Impersonation or fake account', question: 'Is someone using a fake account or pretending to be you?', helper: 'Keep a link, handle, or screenshot that supports this.' },
  { id: 'physical_threat', tag: 'threat', label: 'Threat or intimidation', question: 'Did anyone threaten physical harm, reveal your location, or threaten to come to you?', helper: 'If danger is immediate, prioritise getting to a safer place and contacting emergency help.' },
  { id: 'financial_fraud', tag: 'financial_fraud', label: 'Possible financial cyber fraud', question: 'Did you lose money or share a financial credential/OTP because of this incident?', helper: 'A demand for money is not always financial fraud; answer based on what happened.' },
];

export function buildQuestionnaireFacts(answers, messages, makeId = () => `fact-${Math.random().toString(36).slice(2, 9)}`) {
  const output = [];
  for (const question of QUESTIONNAIRE) {
    if (answers?.[question.id]?.answer !== 'yes') continue;
    const sourceId = answers[question.id].sourceId;
    const source = (messages || []).find((message) => message.id === sourceId);
    if (!source) continue;
    output.push({
      id: makeId(), tag: question.tag, label: question.label,
      summary: `User reports: ${question.question}`,
      quote: source.text, sourceIds: [source.id], confirmed: false,
      source: 'guided questionnaire', userReported: true,
    });
  }
  return output;
}
