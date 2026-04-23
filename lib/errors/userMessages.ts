export interface UserFacingErrorMessage {
  title: string;
  message: string;
}

function readErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function getAnalysisErrorMessage(error: unknown): UserFacingErrorMessage {
  const text = readErrorText(error);
  const lower = text.toLowerCase();

  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('internet') ||
    lower.includes('enotfound') ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('abort')
  ) {
    return {
      title: 'Internet issue',
      message: "Can't do this right now. Check your connection and try again.",
    };
  }

  if (
    lower.includes('openai') ||
    lower.includes('lm') ||
    lower.includes('model') ||
    lower.includes('json') ||
    lower.includes('schema') ||
    lower.includes('refused') ||
    lower.includes('response') ||
    lower.includes('quota') ||
    lower.includes('rate')
  ) {
    return {
      title: 'LM issue',
      message: "Can't analyse this right now. The meal photo is safe to retake or retry.",
    };
  }

  return {
    title: 'Analysis failed',
    message: text || 'Try again or retake the photo.',
  };
}

export function getSyncErrorMessage(error: unknown): UserFacingErrorMessage {
  const text = readErrorText(error).toLowerCase();

  if (
    text.includes('network') ||
    text.includes('failed to fetch') ||
    text.includes('fetch failed') ||
    text.includes('timed out') ||
    text.includes('timeout')
  ) {
    return {
      title: 'Internet issue',
      message: 'Saved on this device. Cloud sync will retry when your connection is back.',
    };
  }

  return {
    title: 'Cloud sync issue',
    message: 'Saved on this device. Cloud sync will retry in the background.',
  };
}
