export class InvalidEventPayloadError extends Error {
  constructor(
    message: string,
    public readonly eventType: string,
    public readonly reason?: string,
  ) {
    super(message);
    this.name = 'InvalidEventPayloadError';
  }
}
