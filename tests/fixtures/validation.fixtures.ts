export const VALID_ANALYZE_PAYLOAD = {
  system: 'You are a career counselor and job description analyzer.',
  message: 'Analyze this job description for Senior Software Engineer.',
  useWebSearch: true
};

export const MISSING_SYSTEM_PAYLOAD = {
  message: 'Analyze this job description for Senior Software Engineer.'
};

export const MISSING_MESSAGE_PAYLOAD = {
  system: 'You are a career counselor and job description analyzer.'
};

export const EMPTY_FIELDS_PAYLOAD = {
  system: '   ',
  message: ''
};

export const OVERSIZED_MESSAGE_PAYLOAD = {
  system: 'Valid system prompt',
  message: 'a'.repeat(100001) // Exceeds 100,000 max length
};

export const OVERSIZED_SYSTEM_PAYLOAD = {
  system: 's'.repeat(10001), // Exceeds 10,000 max length
  message: 'Valid message prompt'
};

export const HTML_AND_CONTROL_CHARS_PAYLOAD = {
  system: '<script>alert("xss")</script> System Prompt \x07 with control char',
  message: '<div>Job Description Text</div> \x00 with newlines \n and tabs \t preserved'
};
