"""hemis sync: hemis_employees, hemis_sync_runs, tutor_groups, nullable hashed_password

Revision ID: a7b8c9d0e1f2
Revises: c6d7e8f9a0b1
Create Date: 2026-11-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'c6d7e8f9a0b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'hemis_employees',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('employee_id_number', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('full_name', sa.String(255), nullable=False, index=True),
        sa.Column('department', sa.String(255), nullable=True, index=True),
        sa.Column('faculty', sa.String(255), nullable=True, index=True),
        sa.Column('position', sa.String(255), nullable=True),
        sa.Column('employee_type', sa.String(100), nullable=True),
        sa.Column('academic_degree', sa.String(255), nullable=True),
        sa.Column('academic_rank', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('tutor_groups', sa.Text(), nullable=True),
        sa.Column('synced_at', sa.DateTime(), nullable=True),
    )
    op.create_table(
        'hemis_sync_runs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('trigger', sa.String(30), nullable=False),
        sa.Column('triggered_by', sa.String(100), nullable=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('students_created', sa.Integer(), nullable=True),
        sa.Column('students_updated', sa.Integer(), nullable=True),
        sa.Column('employees_synced', sa.Integer(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('finished_at', sa.DateTime(), nullable=True),
    )
    op.create_table(
        'tutor_groups',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('tutor_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('group_name', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('assigned_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
    )
    # Talaba va xodimlar uchun parol saqlanmaydi (HEMIS orqali kirish)
    with op.batch_alter_table('users') as batch:
        batch.alter_column('hashed_password', existing_type=sa.String(255), nullable=True)
    # Talaba va xodimlarning parollari tozalanadi (talabalarda bu HEMIS paroli xeshi edi);
    # parol faqat admin va ekspertda qoladi (app.api.users.PASSWORD_ROLES bilan bir xil)
    op.execute("""
        UPDATE users SET hashed_password = NULL
        WHERE role NOT IN ('admin', 'super_admin', 'jury_expert')
          AND id NOT IN (
              SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id
              WHERE r.code IN ('admin', 'super_admin', 'jury_expert')
          )
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("UPDATE users SET hashed_password = '' WHERE hashed_password IS NULL")
    with op.batch_alter_table('users') as batch:
        batch.alter_column('hashed_password', existing_type=sa.String(255), nullable=False)
    op.drop_table('tutor_groups')
    op.drop_table('hemis_sync_runs')
    op.drop_table('hemis_employees')
