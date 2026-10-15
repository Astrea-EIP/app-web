export interface TokenRequest {}
export interface TokenResponse {
  accessToken: string;
}
export interface AuthErrorResponse {
  error: string;
}
export interface AuthServerErrorResponse {
  error: string;
  errorId: string;
}
