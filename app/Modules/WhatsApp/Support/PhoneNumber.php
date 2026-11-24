<?php

declare(strict_types=1);

namespace App\Modules\WhatsApp\Support;

/**
 * WhatsApp numbers are stored as E.164 digits without "+" (e.g. 966551234567).
 */
final class PhoneNumber
{
    public static function normalize(string $raw, string $defaultCountryCode = '966'): string
    {
        $raw = str_replace('whatsapp:', '', trim($raw));
        $digits = preg_replace('/\D+/', '', $raw) ?? '';

        if (str_starts_with($digits, '00')) {
            return substr($digits, 2);
        }
        if (str_starts_with($raw, '+')) {
            return $digits;
        }
        // Local format: 05xxxxxxxx → 9665xxxxxxxx
        if (str_starts_with($digits, '0')) {
            return $defaultCountryCode.substr($digits, 1);
        }
        // Bare local mobile without the leading zero: 5xxxxxxxx (9 digits, Saudi)
        if ($defaultCountryCode === '966' && strlen($digits) === 9 && str_starts_with($digits, '5')) {
            return '966'.$digits;
        }

        return $digits;
    }

    /**
     * Variants used to match the CRM, which stores phones in several formats.
     *
     * @return list<string>
     */
    public static function variants(string $e164): array
    {
        $variants = [$e164, '+'.$e164];
        if (str_starts_with($e164, '966')) {
            $local = substr($e164, 3);
            array_push($variants, '0'.$local, $local);
        }

        return array_values(array_unique($variants));
    }
}
