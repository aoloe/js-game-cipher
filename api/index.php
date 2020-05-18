<?php
require __DIR__ . '/vendor/autoload.php';

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$config = include_once("config.php");
include_once("TinyRest.php");
include_once("Cipher.php");

function get_pusher($config) {
    $pusher = new Pusher\Pusher(
        $config['pusher']['key'],
        $config['pusher']['secret'],
        $config['pusher']['app_id'],
        [
            'cluster' => $config['pusher']['cluster'],
            'useTLS' => $config['pusher']['useTLS']
        ]
  );

  return $pusher;
}

$app = new Aoloe\TinyRest\App('action');
$request = Aoloe\TinyRest\HttpRequest::create();
$response = new Aoloe\TinyRest\HttpResponse();

$app->get('list', function() use($config, $request, $response) {
    $list = [];
    $cipher = new Cipher($config['db']);
    $author = $request->get('author');
    foreach ($cipher->get_list($author) as $item) {
        $list[] = [
            'cipher_id' => $item['hash'],
            'title' => $item['title'],
            'language' => $item['language'],
            'category' => $item['category'],
            'work_in_progress' => $item['work_in_progress'],
            'editable' => $item['editable']
        ];
    }

    $response->respond([
        'admin' => in_array($author, $config['admin']),
        'list' => $list
    ]);
});

$app->get('get', function() use($config, $request, $response) {
    $cipher = new Cipher($config['db']);
    $sort = true;
    $author = null;
    $raw = false;
    if ($request->has('raw') && $request->has('author')) {
        $raw = $request->get('raw') === 'true' ? true : false;
        $author = $request->get('author');
    }
    [$hash, $title, $sentence, $language, $category, $work_in_progress, $description, $cipher_author] = $cipher->get($request->get('id'));
    if ($raw) {
        $response->respond([
            'cipher_id' => $hash,
            'title' => $title,
            'sentence' => ($author === $cipher_author ? $sentence : null),
            'language' => $language,
            'category' => $category,
            'work_in_progress' => $work_in_progress,
            'description' => $description
        ]);
    } else {
        $response->respond([
            'cipher_id' => $hash,
            'title' => $title,
            // TODO: do not send the setence but only the numbers
            'sentence' => $sentence,
            'description' => $description
        ]);
    }
});

$app->post('create', function() use($config, $request, $response) {
    $cipher = new Cipher($config['db']);
    [$id, $hash] = $cipher->add(
        $request->get('title'),
        $request->get('language'),
        $request->get('sentence'),
        $request->get('category'),
        $request->get('work_in_progress'),
        $request->get('description'),
        $request->get('author')
    );
    $response->respond(['id' => $hash]);
});

$app->post('update', function() use($config, $request, $response) {
    $cipher = new Cipher($config['db']);
    [$id, $hash] = $cipher->set(
        $request->get('id'),
        $request->get('title'),
        $request->get('language'),
        $request->get('sentence'),
        $request->get('category'),
        $request->get('work_in_progress'),
        $request->get('description'),
        $request->get('author')
    );
    $response->respond(['id' => $hash]);
});

$app->post('delete', function() use($config, $request, $response) {
    $cipher = new Cipher($config['db']);
    [$hash] = $cipher->delete(
        $request->get('id'),
        $request->get('author')
    );
    $response->respond(['hash' => $hash]);
});

$app->get('user_by_cipher', function() use($config, $request, $response) {
    $cipher = new Cipher($config['db']);
    $user_hash = null;
    if (in_array($request->get('admin'), $config['admin'])) {
        $row = $cipher->get(
            $request->get('id')
        );
        $user_hash = $row[7];
    }
    $response->respond(['user_id' => $user_hash]);
});

$app->post('share', function() use($config, $request, $response) {
    $cipher = new Cipher($config['db']);
    $share_hash = $cipher->share(
        $request->get('id')
    );
    $response->respond(['share_key' => $share_hash]);
});

$app->post('join_shared', function() use($config, $request, $response) {
    $cipher = new Cipher($config['db']);
    $cipher_hash = $cipher->get_shared_game(
        $request->get('key')
    );
    $response->respond(['id' => $cipher_hash]);
});

$app->post('typing', function() use($config, $request, $response) {
    $pusher = get_pusher($config);
    $key = $request->get('share_key');
    $c = $request->get('c');
    $i = $request->get('i');
    $pusher->trigger('cipher', 'typing', ['share_key' => $key, 'c' => $c, 'i' => $i]);
    $response->respond([$key, $c, $i]);
});

if (!$app->run($request)) {
    $response->respond($app->error_message);
}
