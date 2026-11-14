"""meeting concern/help fields (Nizom 17.4-modda)

Revision ID: a9b8c7d6e5f4
Revises: f1a2b3c4d5e6
Create Date: 2026-11-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9b8c7d6e5f4'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('meetings', sa.Column('has_concern', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('meetings', sa.Column('concern_note', sa.Text(), nullable=True))
    op.add_column('meetings', sa.Column('help_action', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('meetings', 'help_action')
    op.drop_column('meetings', 'concern_note')
    op.drop_column('meetings', 'has_concern')
