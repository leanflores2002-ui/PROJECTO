from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo
from fastapi import HTTPException
from .product_schemas import InventorySummary


class StatisticsService:
    @staticmethod
    def dashboard(connection, start: date | None = None, end: date | None = None):
        today = datetime.now(ZoneInfo('America/Argentina/Buenos_Aires')).date()
        start, end = start or today - timedelta(days=29), end or today
        if start > end or (end-start).days > 366:
            raise HTTPException(422, 'Elegí un rango válido de hasta 367 días')
        tz = ZoneInfo('America/Argentina/Buenos_Aires')
        bounds = (datetime.combine(start, time.min, tz), datetime.combine(end+timedelta(days=1), time.min, tz))
        summary = connection.execute("""
            with inventory as (
                select p.id, p.status, count(v.id) as variants,
                  coalesce(sum(v.stock),0) as units,
                  count(v.id) filter(where v.stock=0) as empty_variants,
                  bool_or(v.stock>0 and v.stock<=v.low_stock_threshold) as low,
                  sum(v.stock * coalesce(v.price_override,pg.amount,p.base_price)) as value
                from public.products p
                left join public.product_variants v on v.product_id=p.id and v.status='active'
                left join public.product_size_price_groups spg on spg.product_id=p.id and spg.size=v.size
                left join public.product_price_groups pg on pg.product_id=p.id and pg.price_group=spg.price_group
                where p.deleted_at is null group by p.id
            ) select count(*) as total_products,
              count(*) filter(where status='published') as published_products,
              count(*) filter(where status='hidden') as hidden_products,
              count(*) filter(where status='draft') as draft_products,
              coalesce(sum(variants),0) as total_variants, coalesce(sum(units),0) as units_in_stock,
              count(*) filter(where low) as low_stock_products,
              count(*) filter(where units=0) as out_of_stock_products,
              coalesce(sum(empty_variants),0) as out_of_stock_variants,
              sum(value) as inventory_value from inventory
        """).fetchone()
        movements = connection.execute("""
            select movement_type, count(*) as movements,
              coalesce(sum(quantity_delta) filter(where quantity_delta>0),0) as incoming,
              coalesce(-sum(quantity_delta) filter(where quantity_delta<0),0) as outgoing
            from public.stock_movements where created_at >= %s and created_at < %s
            group by movement_type order by movement_type
        """, bounds).fetchall()
        stock = connection.execute("""
            select p.id, p.name, coalesce(sum(v.stock),0) as stock,
              bool_or(v.stock>0 and v.stock<=v.low_stock_threshold) as low
            from public.products p left join public.product_variants v
              on v.product_id=p.id and v.status='active'
            where p.deleted_at is null group by p.id order by stock, p.name
        """).fetchall()
        views = connection.execute("""
            select p.id, p.name, count(e.id) as views from public.products p
            left join public.product_view_events e on e.product_id=p.id and e.created_at >= %s and e.created_at < %s
            where p.deleted_at is null group by p.id order by views desc, p.name
        """, bounds).fetchall()
        popular = connection.execute("""
            select p.id, p.name, count(*) as movements from public.stock_movements m
            join public.product_variants v on v.id=m.variant_id join public.products p on p.id=v.product_id
            where m.created_at >= %s and m.created_at < %s
            group by p.id order by movements desc limit 10
        """, bounds).fetchall()
        sales = connection.execute("""
            select v.id, p.name, v.color, v.size, sum(i.quantity) as units
            from public.order_items i join public.orders o on o.id=i.order_id
            join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id
            where o.status='completed' and o.created_at >= %s and o.created_at < %s
            group by v.id,p.name order by units desc limit 10
        """, bounds).fetchall()
        return {'summary': InventorySummary(**summary).model_dump(), 'movements': movements,
                'range': {'start': start, 'end': end}, 'mostStock': list(reversed(stock))[:10],
                'leastStock': stock[:10], 'lowStock': [p for p in stock if p['low']][:20],
                'outOfStock': [p for p in stock if p['stock']==0][:20],
                'mostViewed': views[:10], 'leastViewed': list(reversed(views))[:10],
                'totalViews': sum(p['views'] for p in views), 'mostMovements': popular,
                'bestSellers': sales}
