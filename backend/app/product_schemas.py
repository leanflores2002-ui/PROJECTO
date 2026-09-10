from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class ProductVariant(BaseModel):
    id: str
    color: str
    size: str
    stock: int
    lowStockThreshold: int = 3
    priceOverride: Decimal | None = None
    unitPrice: Decimal | None = None
    status: str = 'active'


class ProductListItem(BaseModel):
    # The compatibility adapter retains established image/color fields.
    model_config = ConfigDict(extra='allow')
    id: str
    databaseId: str
    slug: str
    name: str
    price: Decimal
    section: str
    image: str


class ProductDetail(ProductListItem):
    description: str = ''
    specifications: dict[str, Any] = {}
    variants: list[ProductVariant] = []


class InventorySummary(BaseModel):
    total_products: int
    published_products: int
    hidden_products: int
    draft_products: int
    total_variants: int
    units_in_stock: int
    low_stock_products: int
    out_of_stock_products: int
    out_of_stock_variants: int
    inventory_value: Decimal | None


class AdminProductDetail(BaseModel):
    model_config = ConfigDict(extra='allow')
    id: UUID
    name: str
    slug: str
    sku: str
    updated_at: datetime
    variants: list[dict]
