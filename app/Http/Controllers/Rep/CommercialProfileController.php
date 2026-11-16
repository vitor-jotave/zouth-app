<?php

declare(strict_types=1);

namespace App\Http\Controllers\Rep;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateRepresentativeProfileRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CommercialProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('rep/commercial-profile', [
            'profile' => $request->user()->salesRepresentativeProfile?->only(['whatsapp', 'city', 'state', 'territory', 'presentation']),
        ]);
    }

    public function update(UpdateRepresentativeProfileRequest $request): RedirectResponse
    {
        $request->user()->salesRepresentativeProfile()->updateOrCreate([], $request->validated());

        return to_route('rep.commercial-profile.edit');
    }
}
