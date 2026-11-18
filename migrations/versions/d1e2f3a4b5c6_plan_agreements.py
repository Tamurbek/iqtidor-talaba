"""development plan agreements (Nizom 18-modda)

Revision ID: d1e2f3a4b5c6
Revises: c2d3e4f5a6b7
Create Date: 2026-11-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('development_plans', sa.Column('student_agreed_at', sa.DateTime(), nullable=True))
    op.add_column('development_plans', sa.Column('tutor_agreed_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('development_plans', 'tutor_agreed_at')
    op.drop_column('development_plans', 'student_agreed_at')
