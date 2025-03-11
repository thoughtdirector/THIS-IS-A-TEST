"""add

Revision ID: 55a973118bc5
Revises: 7bc69ed2c214
Create Date: 2025-03-11 05:56:06.885392

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '55a973118bc5'
down_revision = '7bc69ed2c214'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('planinstance',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('client_group_id', sa.Uuid(), nullable=False),
    sa.Column('plan_id', sa.Uuid(), nullable=False),
    sa.Column('start_date', sa.DateTime(), nullable=False),
    sa.Column('end_date', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('total_cost', sa.Float(), nullable=False),
    sa.Column('paid_amount', sa.Float(), nullable=False),
    sa.Column('remaining_entries', sa.Integer(), nullable=True),
    sa.Column('remaining_limits', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('purchased_addons', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.ForeignKeyConstraint(['client_group_id'], ['clientgroup.id'], ),
    sa.ForeignKeyConstraint(['plan_id'], ['plan.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('plantoken',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('plan_id', sa.Uuid(), nullable=False),
    sa.Column('plan_instance_id', sa.Uuid(), nullable=False),
    sa.Column('token_value', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('uses_count', sa.Integer(), nullable=False),
    sa.Column('max_uses', sa.Integer(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['plan_id'], ['plan.id'], ),
    sa.ForeignKeyConstraint(['plan_instance_id'], ['planinstance.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_plantoken_token_value'), 'plantoken', ['token_value'], unique=True)
    op.create_table('plantokenuse',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('token_id', sa.Uuid(), nullable=False),
    sa.Column('client_id', sa.Uuid(), nullable=False),
    sa.Column('used_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['client.id'], ),
    sa.ForeignKeyConstraint(['token_id'], ['plantoken.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.add_column('payment', sa.Column('plan_instance_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(None, 'payment', 'planinstance', ['plan_instance_id'], ['id'])
    op.add_column('plan', sa.Column('entries', sa.Integer(), nullable=True))
    op.add_column('plan', sa.Column('limits', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.drop_column('plan', 'is_class_plan')
    op.drop_column('plan', 'max_classes')
    op.add_column('visit', sa.Column('plan_instance_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(None, 'visit', 'planinstance', ['plan_instance_id'], ['id'])
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'visit', type_='foreignkey')
    op.drop_column('visit', 'plan_instance_id')
    op.add_column('plan', sa.Column('max_classes', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('plan', sa.Column('is_class_plan', sa.BOOLEAN(), autoincrement=False, nullable=False))
    op.drop_column('plan', 'limits')
    op.drop_column('plan', 'entries')
    op.drop_constraint(None, 'payment', type_='foreignkey')
    op.drop_column('payment', 'plan_instance_id')
    op.drop_table('plantokenuse')
    op.drop_index(op.f('ix_plantoken_token_value'), table_name='plantoken')
    op.drop_table('plantoken')
    op.drop_table('planinstance')
    # ### end Alembic commands ###
