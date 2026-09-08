<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WbLicense extends Model
{
    protected $fillable = ['license_key', 'payment_id', 'email', 'amount', 'status', 'paid_at'];

    protected $casts = ['paid_at' => 'datetime'];
}
