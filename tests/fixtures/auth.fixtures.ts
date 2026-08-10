export const TEST_SECRET_KEY = 'test_secret_api_key_12345';
export const TEST_INVALID_KEY = 'wrong_secret_api_key_99999';

export const MOCK_ANALYZE_PAYLOAD = {
  system: 'You are a career counselor and job description analyzer.',
  message: 'Analyze this job description for Senior Software Engineer.',
  useWebSearch: false
};

export const MOCK_OPENAI_RESPONSE = {
  output_text: JSON.stringify({
    summary: 'Senior Software Engineer role focusing on React and TypeScript.',
    keySkills: ['React', 'TypeScript', 'Node.js'],
    matchScore: 85
  })
};
