"""Inventory writes share the caller's transaction; PostgreSQL is authoritative."""
from fastapi import HTTPException


class InventoryService:
    @classmethod
    def release_stock(cls, connection, order_id, admin_id):
        """Caller locks orders first and calls only on transition to cancelled."""
        rows = connection.execute("""
            select v.id,v.stock,i.quantity from public.order_items i
            join public.product_variants v on v.id=i.variant_id
            where i.order_id=%s order by v.id for update of v
        """, (order_id,)).fetchall()
        for row in rows:
            after = row['stock'] + row['quantity']
            connection.execute('update public.product_variants set stock=%s,updated_at=now() where id=%s', (after,row['id']))
            cls.record_movement(connection,row['id'],row['stock'],after,'Cancelacion o devolucion de pedido',
                                'cancellation',admin_id,order_id)

    @staticmethod
    def list_stock(connection):
        return connection.execute("""
            select v.id as variant_id, v.product_id as database_product_id,
                   coalesce(p.legacy_id, p.slug) as product_id, p.slug, v.color, v.size,
                   v.stock, v.low_stock_threshold, v.status,
                   coalesce(v.price_override, pg.amount, p.base_price) as unit_price
            from public.product_variants v join public.products p on p.id = v.product_id
            left join public.product_size_price_groups spg on spg.product_id=p.id and spg.size=v.size
            left join public.product_price_groups pg on pg.product_id=p.id and pg.price_group=spg.price_group
            where p.status='published' and p.deleted_at is null and v.status='active'
            order by v.id
        """).fetchall()

    @staticmethod
    def record_movement(connection, variant_id, before, after, reason, movement_type='adjustment', admin_id=None, order_id=None):
        if before == after:
            return None
        return connection.execute("""
            insert into public.stock_movements
                (variant_id, movement_type, quantity_delta, stock_before, stock_after, reason, admin_user_id, order_id)
            values (%s,%s,%s,%s,%s,%s,%s,%s) returning id
        """, (variant_id, movement_type, after-before, before, after, reason, admin_id, order_id)).fetchone()['id']

    @classmethod
    def adjust_stock(cls, connection, variant_id, payload, admin_id):
        variant = connection.execute(
            'select id, product_id, stock, updated_at from public.product_variants where id=%s for update',
            (variant_id,),
        ).fetchone()
        if not variant:
            raise HTTPException(404, 'Variante no encontrada')
        if payload.expected_updated_at != variant['updated_at']:
            raise HTTPException(409, 'El inventario cambió. Recargá la variante antes de ajustar.')
        before = variant['stock']
        after = payload.stock if payload.operation == 'set' else before + (payload.quantity if payload.operation == 'add' else -payload.quantity)
        if after < 0:
            raise HTTPException(409, 'Stock insuficiente: el ajuste dejaría stock negativo')
        row = connection.execute(
            'update public.product_variants set stock=%s, updated_at=now() where id=%s returning updated_at',
            (after, variant_id),
        ).fetchone()
        movement = cls.record_movement(connection, variant_id, before, after, payload.reason, payload.movement_type, admin_id)
        return {'variantId': variant_id, 'stockBefore': before, 'quantityDelta': after-before,
                'stock': after, 'updated_at': row['updated_at'], 'movementId': movement}
