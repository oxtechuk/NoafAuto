<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Services;

/**
 * Post-check of the model's reply: every price-like number must come from a
 * tool result of this turn. Unverified numbers are flagged (and logged), and a
 * disclaimer is appended so the customer is never misled by an invented figure.
 */
class OutputGuard
{
    /**
     * @param  list<array<string, mixed>>  $toolData
     * @return array{text: string, flags: list<string>}
     */
    public function check(string $reply, array $toolData, string $disclaimer): array
    {
        $flags = [];
        $known = $this->knownNumbers($toolData);

        foreach ($this->numbersIn($reply) as $number) {
            if ($number < 1000 || ($number >= 1990 && $number <= 2100)) {
                continue; // small numbers, years
            }
            $matches = array_filter($known, fn (float $value) => abs($value - $number) <= max(1, $value * 0.005));
            if ($matches === []) {
                $flags[] = 'unverified_number:'.$number;
            }
        }

        if ($flags !== [] && $disclaimer !== '' && ! str_contains($reply, $disclaimer)) {
            $reply .= "\n\n".$disclaimer;
        }

        return ['text' => $reply, 'flags' => array_values(array_unique($flags))];
    }

    /**
     * @param  list<array<string, mixed>>  $toolData
     * @return list<float>
     */
    private function knownNumbers(array $toolData): array
    {
        $numbers = [];
        array_walk_recursive($toolData, function ($value) use (&$numbers): void {
            if (is_int($value) || is_float($value)) {
                $numbers[] = (float) $value;
            } elseif (is_string($value)) {
                array_push($numbers, ...$this->numbersIn($value));
            }
        });

        return $numbers;
    }

    /**
     * @return list<float>
     */
    private function numbersIn(string $text): array
    {
        $text = strtr($text, ['٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9', '٬' => ',', '٫' => '.']);
        preg_match_all('/\d[\d,]*(?:\.\d+)?/', $text, $matches);

        return array_map(fn (string $n) => (float) str_replace(',', '', $n), $matches[0]);
    }
}
