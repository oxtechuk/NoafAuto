<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Infrastructure;

use App\Http\Requests\Api\ApiBaseRequest;
use Closure;

final class UpdateCdnRequest extends ApiBaseRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user('employee')?->isAdmin();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'url' => [
                'required_if:enabled,true',
                'nullable',
                'url:https,http',
                'max:255',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value) || $value === '') {
                        return;
                    }
                    if (parse_url($value, PHP_URL_QUERY) !== null || parse_url($value, PHP_URL_FRAGMENT) !== null) {
                        $fail('رابط الـ CDN يجب أن يكون بدون ? أو #.');
                    }
                    if (strcasecmp((string) parse_url($value, PHP_URL_HOST), (string) parse_url((string) config('app.url'), PHP_URL_HOST)) === 0) {
                        $fail('رابط الـ CDN يجب أن يكون دومين مختلف عن الموقع (مثل cdn.example.com).');
                    }
                },
            ],
        ];
    }
}
