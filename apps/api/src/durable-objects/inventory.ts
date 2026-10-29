import type { Env } from '../env';

/**
 * Coordination boundary for future variant reservations.
 *
 * D1 remains the source of truth for relational data. This object will be
 * introduced only around the critical stock reservation section once the
 * order model is migrated and concurrency requirements are measured.
 */
export class InventoryDurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    void request;
    void this.state;
    void this.env;
    return Response.json(
      {
        error: 'inventory_coordination_not_implemented',
        status: 'reserved-for-stock-migration',
      },
      { status: 501 },
    );
  }
}
