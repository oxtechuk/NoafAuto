<?php

declare(strict_types=1);

namespace App\Modules\AiAssistant\Support;

use RuntimeException;

/** Provider or configuration failure that must not leak details to customers. */
class AssistantException extends RuntimeException {}
