export const VALID_API_REQUEST = {
  system: 'You are a career counselor and job description analyzer.',
  message: 'Analyze this job description for Senior Software Engineer.',
  useWebSearch: true
};

export const MISSING_SYSTEM_API_REQUEST = {
  message: 'Analyze this job description for Senior Software Engineer.'
};

export const MISSING_MESSAGE_API_REQUEST = {
  system: 'You are a career counselor and job description analyzer.'
};

export const OVERSIZED_SYSTEM_API_REQUEST = {
  system: 'S'.repeat(10001),
  message: 'Valid message'
};

export const OVERSIZED_MESSAGE_API_REQUEST = {
  system: 'Valid system prompt',
  message: 'M'.repeat(100001)
};

export const XSS_HTML_API_REQUEST = {
  system: '<script>alert("xss")</script> System Prompt \x07 with control char',
  message: '<div>Job Description Text</div> \x00 with newlines \n and tabs \t preserved'
};
