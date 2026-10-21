/** Map known Auth failures without exposing raw provider messages or account details. */
export function describeAuthError(error, mode) {
  if (error?.code === 'over_email_send_rate_limit')
    return {
      cooldown: true,
      message:
        'Email sending is temporarily rate-limited. Check your inbox for an earlier confirmation email. Wait before requesting another; the project may need a custom SMTP provider.',
    };
  if (
    error?.status === 429 ||
    ['over_request_rate_limit', 'over_sms_send_rate_limit'].includes(error?.code)
  )
    return {
      cooldown: true,
      message:
        'Too many authentication requests. Please wait before trying again. Repeated attempts will not resolve the limit.',
    };
  if (error?.code === 'email_not_confirmed')
    return { message: 'Confirm your email using the link in your inbox before signing in.' };
  return {
    message:
      mode === 'reset'
        ? 'Could not complete the password request. Check the link or try again.'
        : mode === 'register'
          ? 'Could not register. Check your details and try again.'
          : 'Could not sign in. Check your email, password and connection.',
  };
}
