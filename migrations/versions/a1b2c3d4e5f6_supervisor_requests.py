"""supervisor requests and capacity (Nizom 10-modda)

Revision ID: a1b2c3d4e5f6
Revises: d6cc5ac88529
Create Date: 2026-11-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'd6cc5ac88529'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('supervisor_capacity', sa.Integer(), nullable=True))

    op.create_table(
        'supervisor_requests',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('supervisor_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('research_topic', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='pending'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('requested_at', sa.DateTime(), nullable=True),
        sa.Column('decided_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_supervisor_requests_status', 'supervisor_requests', ['status'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_supervisor_requests_status', table_name='supervisor_requests')
    op.drop_table('supervisor_requests')
    op.drop_column('users', 'supervisor_capacity')
