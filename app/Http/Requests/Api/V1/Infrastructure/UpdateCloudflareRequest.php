<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Infrastructure;

use App\Http\Requests\Api\ApiBaseRequest;

final class UpdateCloudflareRequest extends ApiBaseRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user('employee')?->isAdmin();
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'zone_id' => ['required_if:enabled,true', 'nullable', 'string', 'regex:/^[a-f0-9]{32}$/i'],
            'api_token' => ['nullable', 'string', 'max:255'],
            'trust_proxies' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'zone_id.regex' => 'الـ Zone ID يتكون من 32 حرفاً (تجده في صفحة Overview للدومين في Cloudflare).',
        ];
    }
}
