/** When EXPO_PUBLIC_ALLOW_SELF_SIGNUP is "false", hide self-service registration (staff provisioning only). */
export const allowSelfSignup = process.env.EXPO_PUBLIC_ALLOW_SELF_SIGNUP !== 'false';
