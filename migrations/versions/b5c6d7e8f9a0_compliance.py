"""gifted status revoke, integrity violations, incentive proposals (Nizom 5, 31, 36, 7.8, 33)

Revision ID: b5c6d7e8f9a0
Revises: a4b5c6d7e8f9
Create Date: 2026-11-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5c6d7e8f9a0'
down_revision: Union[str, Sequence[str], None] = 'a4b5c6d7e8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('gifted_applications', sa.Column('revoked_at', sa.DateTime(), nullable=True))
    op.add_column('gifted_applications', sa.Column('revoked_by_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_gifted_applications_revoked_by', 'gifted_applications', 'users', ['revoked_by_id'], ['id'], ondelete='SET NULL')
    op.add_column('gifted_applications', sa.Column('revoke_reason', sa.Text(), nullable=True))

    op.create_table(
        'integrity_violations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('achievement_id', sa.Integer(), sa.ForeignKey('student_achievements.id', ondelete='SET NULL'), nullable=True),
        sa.Column('violation_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('action_taken', sa.Text(), nullable=True),
        sa.Column('recorded_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_integrity_violations_id'), 'integrity_violations', ['id'], unique=False)
    op.create_index(op.f('ix_integrity_violations_student_id'), 'integrity_violations', ['student_id'], unique=False)

    op.create_table(
        'incentive_proposals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('target_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_role', sa.String(length=30), nullable=False),
        sa.Column('incentive_type', sa.String(length=50), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('proposed_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('decision_note', sa.Text(), nullable=True),
        sa.Column('decided_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('decided_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_incentive_proposals_id'), 'incentive_proposals', ['id'], unique=False)
    op.create_index(op.f('ix_incentive_proposals_target_user_id'), 'incentive_proposals', ['target_user_id'], unique=False)
    op.create_index(op.f('ix_incentive_proposals_status'), 'incentive_proposals', ['status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_incentive_proposals_status'), table_name='incentive_proposals')
    op.drop_index(op.f('ix_incentive_proposals_target_user_id'), table_name='incentive_proposals')
    op.drop_index(op.f('ix_incentive_proposals_id'), table_name='incentive_proposals')
    op.drop_table('incentive_proposals')
    op.drop_index(op.f('ix_integrity_violations_student_id'), table_name='integrity_violations')
    op.drop_index(op.f('ix_integrity_violations_id'), table_name='integrity_violations')
    op.drop_table('integrity_violations')
    op.drop_column('gifted_applications', 'revoke_reason')
    op.drop_constraint('fk_gifted_applications_revoked_by', 'gifted_applications', type_='foreignkey')
    op.drop_column('gifted_applications', 'revoked_by_id')
    op.drop_column('gifted_applications', 'revoked_at')
