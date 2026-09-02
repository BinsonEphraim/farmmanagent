import 'dotenv/config';

const getFrontendBaseUrl = () => {
  const rawUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:5173';

  try {
    const url = new URL(rawUrl);
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid FRONTEND_URL: ${rawUrl}`);
  }
};

const buildFrontendUrl = (path: string, token: string) => {
  const url = new URL(path, `${getFrontendBaseUrl()}/`);
  url.searchParams.set('token', token);
  return url.toString();
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = buildFrontendUrl('/verify-email', token);

  console.log(`Sending verification email to ${email}`);
  console.log(`Verification link: ${verificationUrl}`);

  return { success: true, verificationUrl };
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetUrl = buildFrontendUrl('/reset-password', token);

  console.log(`Sending password reset email to ${email}`);
  console.log(`Reset link: ${resetUrl}`);

  return { success: true, resetUrl };
};
