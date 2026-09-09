export async function up(knex) {
  await knex.schema.createTable('bands', (t) => {
    t.string('id', 32).primary();
    t.string('name', 160).notNullable();
    t.string('slug', 180).notNullable().unique();
    t.text('description');
    t.string('genre', 120);
    t.string('location', 190);
    t.string('photo_url');
    t.string('owner_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
    t.index(['genre']);
    t.index(['location']);
  });

  await knex.schema.createTable('band_members', (t) => {
    t.string('id', 32).primary();
    t.string('band_id', 32).notNullable().references('id').inTable('bands').onDelete('CASCADE');
    t.string('user_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('role', 20).defaultTo('member'); // owner | member
    t.string('status', 20).defaultTo('pending'); // active | pending
    t.datetime('joined_at').defaultTo(knex.fn.now());
    t.unique(['band_id', 'user_id']);
    t.index(['user_id']);
  });

  await knex.schema.createTable('follows', (t) => {
    t.string('id', 32).primary();
    t.string('follower_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('target_type', 20).notNullable(); // user | band
    t.string('target_id', 32).notNullable();
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.unique(['follower_id', 'target_type', 'target_id']);
    t.index(['target_type', 'target_id']);
  });

  await knex.schema.createTable('community_posts', (t) => {
    t.string('id', 32).primary();
    t.string('author_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('band_id', 32).references('id').inTable('bands').onDelete('SET NULL');
    t.string('type', 20).defaultTo('post'); // post | recruit
    t.string('title', 200);
    t.text('body').notNullable();
    t.string('link');
    t.string('topic', 80);
    t.string('genre', 120);
    t.string('location', 190);
    t.string('instrument', 120);
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
    t.index(['type', 'created_at']);
    t.index(['topic']);
    t.index(['genre']);
  });

  await knex.schema.createTable('post_likes', (t) => {
    t.string('id', 32).primary();
    t.string('post_id', 32).notNullable().references('id').inTable('community_posts').onDelete('CASCADE');
    t.string('user_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.unique(['post_id', 'user_id']);
  });

  await knex.schema.createTable('post_comments', (t) => {
    t.string('id', 32).primary();
    t.string('post_id', 32).notNullable().references('id').inTable('community_posts').onDelete('CASCADE');
    t.string('author_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('body').notNullable();
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.index(['post_id', 'created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('post_comments');
  await knex.schema.dropTableIfExists('post_likes');
  await knex.schema.dropTableIfExists('community_posts');
  await knex.schema.dropTableIfExists('follows');
  await knex.schema.dropTableIfExists('band_members');
  await knex.schema.dropTableIfExists('bands');
}
