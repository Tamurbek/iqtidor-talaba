"""gifted applications and monitoring reports (Nizom 7.1/10, 28-modda)

Revision ID: b1c2d3e4f5a6
Revises: a9b8c7d6e5f4
Create Date: 2026-11-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a9b8c7d6e5f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'gifted_applications',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('student_name', sa.String(length=255), nullable=False),
        sa.Column('hemis_id', sa.String(length=50), nullable=False),
        sa.Column('faculty', sa.String(length=255), nullable=True),
        sa.Column('direction', sa.String(length=255), nullable=True),
        sa.Column('course', sa.Integer(), nullable=True),
        sa.Column('motivation_text', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True, server_default='pending'),
        sa.Column('decision_note', sa.Text(), nullable=True),
        sa.Column('reviewed_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'monitoring_reports',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('period', sa.String(length=20), nullable=False),
        sa.Column('generated_at', sa.DateTime(), nullable=True, index=True),
        sa.Column('summary_json', sa.JSON(), nullable=False),
        sa.Column('at_risk_count', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('monitoring_reports')
    op.drop_table('gifted_applications')
