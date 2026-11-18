<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Tasks;

use App\Http\Requests\Api\ApiBaseRequest;

final class TaskPostponeRequest extends ApiBaseRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'days' => ['required', 'integer', 'min:1', 'max:365'],
        ];
    }
}
