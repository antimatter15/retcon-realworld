CREATE TABLE user (
    id integer PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    bio text,
    picture text,
    password text,
    creation_date datetime default current_timestamp
);

CREATE TABLE post (
    id integer primary key,
    author integer references user(id),
    title text,
    description text,
    body text,
    creation_date datetime default current_timestamp
);

CREATE TABLE post_tags (
    id integer primary key,
    post integer references post(id),
    tag text,
    creation_date datetime default current_timestamp
);

CREATE UNIQUE INDEX post_tags_idx ON post_tags(post, tag);
CREATE INDEX post_tags_tag_idx ON post_tags(tag, post);

CREATE TABLE post_favorite (
    id integer primary key,
    user integer references user(id),
    post integer references post(id),
    creation_date datetime default current_timestamp
);
CREATE UNIQUE INDEX post_favorite_idx ON post_favorite(post, user);
CREATE INDEX post_favorite_user_idx ON post_favorite(user, post);

CREATE TABLE post_comment (
    id integer primary key,
    author integer references user(id),
    post integer references post(id),
    message text,
    creation_date datetime default current_timestamp
);

CREATE TABLE user_follow (
    id integer primary key,
    follower integer references user(id),
    user integer references user(id),
    creation_date datetime default current_timestamp
);
CREATE UNIQUE INDEX user_follow_idx ON user_follow(user, follower);