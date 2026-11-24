<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Settings;

use App\Http\Requests\Api\ApiBaseRequest;

final class SettingUpdateRequest extends ApiBaseRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'settings' => [
                'required_without_all:site_logo,footer_logo,site_favicon,admin_login_bg,admin_login_logo,admin_sidebar_logo,breadcrumb_bg,popup_image,page_loader_image,default_car_image,request_car_icon,hero_ad_1_image,hero_ad_2_image,cars_hero_image,offers_hero_image,offers_hero_image_mobile,booking_hero_image,main_gallery,delete_gallery_image',
            ],
            'site_logo' => ['nullable', 'image', 'max:5120'],
            'footer_logo' => ['nullable', 'image', 'max:5120'],
            'site_favicon' => ['nullable', 'max:2048'],
            'admin_login_bg' => ['nullable', 'image', 'max:8192'],
            'admin_login_logo' => ['nullable', 'image', 'max:5120'],
            'admin_sidebar_logo' => ['nullable', 'image', 'max:5120'],
            'breadcrumb_bg' => ['nullable', 'image', 'max:8192'],
            'popup_image' => ['nullable', 'image', 'max:5120'],
            'page_loader_image' => ['nullable', 'max:5120'],
            'default_car_image' => ['nullable', 'image', 'max:5120'],
            'request_car_icon' => ['nullable'],
            'hero_ad_1_image' => ['nullable', 'image', 'max:5120'],
            'hero_ad_2_image' => ['nullable', 'image', 'max:5120'],
            'cars_hero_image' => ['nullable', 'image', 'max:8192'],
            'offers_hero_image' => ['nullable', 'image', 'max:8192'],
            'offers_hero_image_mobile' => ['nullable', 'image', 'max:8192'],
            'booking_hero_image' => ['nullable', 'image', 'max:8192'],
            'main_gallery' => ['nullable', 'array'],
            'main_gallery.*' => ['nullable', 'image', 'max:8192'],
            'delete_gallery_image' => ['nullable', 'string'],
        ];
    }
}
