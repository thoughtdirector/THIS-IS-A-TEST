"""Relation between child and order item correct

Revision ID: 0b72ad7011d1
Revises: 0872e929f6d1
Create Date: 2025-03-26 01:14:26.025185

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '0b72ad7011d1'
down_revision = '0872e929f6d1'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('order_item', sa.Column('child_id', sa.Integer(), nullable=False))
    op.create_foreign_key(None, 'order_item', 'child', ['child_id'], ['child_id'])
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'order_item', type_='foreignkey')
    op.drop_column('order_item', 'child_id')
    # ### end Alembic commands ###
