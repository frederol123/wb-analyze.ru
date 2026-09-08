<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{VisitController,NoteController};

Route::get('/', function () {
    return view('product');
});
Route::get('/welcome', function () {
    return view('welcome');
});

// Публичные заметки - доступны всем
Route::get('/public-notes', [NoteController::class, 'publicIndex'])->name('notes.public');
Route::get('/public-notes/{note}', [NoteController::class, 'publicShow'])->name('notes.public.show');

Route::get('/dashboard', function () {
    return view('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('notes', NoteController::class);
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::get('/visite', [VisitController::class, 'visit'])->name('visite');

Route::get('/product', function () { return view('product'); })->name('product');
Route::get('/privacy', function () { return view('privacy'); })->name('privacy');
Route::get('/price-list.png', function () {
    $path = public_path('price-list.png');
    if (file_exists($path)) return response()->file($path);
    abort(404);
});


require __DIR__.'/auth.php';
