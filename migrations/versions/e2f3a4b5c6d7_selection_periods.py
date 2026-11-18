"""selection periods, quota, commission (Nizom 8, 14.5-modda)

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-11-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'selection_periods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('academic_year', sa.String(length=20), nullable=False),
        sa.Column('order_number', sa.String(length=100), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=False),
        sa.Column('quota', sa.Integer(), nullable=True),
        sa.Column('commission_member_ids', sa.JSON(), nullable=False),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_selection_periods_id'), 'selection_periods', ['id'], unique=False)
    op.add_column('gifted_applications', sa.Column('period_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_gifted_applications_period_id', 'gifted_applications', 'selection_periods',
        ['period_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index(op.f('ix_gifted_applications_period_id'), 'gifted_applications', ['period_id'], unique=False)
    op.add_column('gifted_applications', sa.Column('score_at_review', sa.Float(), nullable=True))
    op.add_column('gifted_applications', sa.Column('tier_at_review', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('gifted_applications', 'tier_at_review')
    op.drop_column('gifted_applications', 'score_at_review')
    op.drop_index(op.f('ix_gifted_applications_period_id'), table_name='gifted_applications')
    op.drop_constraint('fk_gifted_applications_period_id', 'gifted_applications', type_='foreignkey')
    op.drop_column('gifted_applications', 'period_id')
    op.drop_index(op.f('ix_selection_periods_id'), table_name='selection_periods')
    op.drop_table('selection_periods')
