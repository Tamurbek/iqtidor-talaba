"""semester reports of supervisors/tutors (Nizom 30-modda)

Revision ID: a4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-11-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4b5c6d7e8f9'
down_revision: Union[str, Sequence[str], None] = 'f3a4b5c6d7e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'semester_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(length=30), nullable=False),
        sa.Column('author_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('author_role', sa.String(length=30), nullable=False),
        sa.Column('semester', sa.String(length=20), nullable=False),
        sa.Column('faculty', sa.String(length=255), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('stats_json', sa.JSON(), nullable=True),
        sa.Column('included_report_ids', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('author_id', 'semester', 'kind', name='uq_semester_report_author'),
    )
    op.create_index(op.f('ix_semester_reports_id'), 'semester_reports', ['id'], unique=False)
    op.create_index(op.f('ix_semester_reports_author_id'), 'semester_reports', ['author_id'], unique=False)
    op.create_index(op.f('ix_semester_reports_semester'), 'semester_reports', ['semester'], unique=False)
    op.create_index(op.f('ix_semester_reports_faculty'), 'semester_reports', ['faculty'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_semester_reports_faculty'), table_name='semester_reports')
    op.drop_index(op.f('ix_semester_reports_semester'), table_name='semester_reports')
    op.drop_index(op.f('ix_semester_reports_author_id'), table_name='semester_reports')
    op.drop_index(op.f('ix_semester_reports_id'), table_name='semester_reports')
    op.drop_table('semester_reports')
