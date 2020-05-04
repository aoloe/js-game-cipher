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
    foreach ($cipher->get_list() as $item) {
        $list[] = ['cipher_id' => $item['hash'], 'title' => $item['title'], 'language' => $item['language']];
    }
    $response->respond($list);
});

$app->get('get', function() use($config, $request, $response) {
    $cipher = new Cipher($config['db']);
    [$hash, $title, $sentence, $description] = $cipher->get($request->get('id'));
    $response->respond(['cipher_id' => $hash, 'title' => $title, 'sentence' => $sentence, 'description' => $description]);
});

$app->post('create', function() use($config, $request, $response) {
    $cipher = new Cipher($config['db']);
    [$id, $hash] = $cipher->add(
        $request->get('title'),
        $request->get('language'),
        $request->get('sentence'),
        $request->get('description'),
        $request->get('author')
    );
    $response->respond(['id' => $hash]);
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
