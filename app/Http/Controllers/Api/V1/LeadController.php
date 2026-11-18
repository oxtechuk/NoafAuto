<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Http\Requests\Api\V1\Leads\LeadRequest;
use App\Http\Resources\V1\LeadResource;
use App\Models\Lead;
use App\Services\Leads\LeadFilterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class LeadController extends ApiBaseController
{
    private const RELATIONS = ['contactSource', 'car.brand', 'employee'];

    private const MAX_PER_PAGE = 100;

    public function index(Request $request, LeadFilterService $filters): ApiResponse
    {
        Gate::authorize('viewAny', Lead::class);

        $perPage = min(max((int) $request->integer('per_page', 20), 1), self::MAX_PER_PAGE);

        $query = Lead::query()->with(self::RELATIONS)->withCount('orders');
        $filters->apply($query, $request->query(), $request->user('employee'));

        $leads = $query->paginate($perPage)->withQueryString();
        $leads->setCollection(collect(LeadResource::collection($leads->getCollection())->resolve()));

        return $this->respondPaginated($leads, 'Leads retrieved successfully');
    }

    public function store(LeadRequest $request): ApiResponse
    {
        Gate::authorize('create', Lead::class);

        $lead = Lead::create($request->validated());

        return $this->respondCreated($this->leadData($lead), 'Lead created successfully');
    }

    public function show(Lead $lead): ApiResponse
    {
        Gate::authorize('view', $lead);

        return $this->respondSuccess($this->leadData($lead));
    }

    public function update(LeadRequest $request, Lead $lead): ApiResponse
    {
        Gate::authorize('update', $lead);

        $lead->update($request->validated());

        return $this->respondSuccess($this->leadData($lead), 'Lead updated successfully');
    }

    public function destroy(Lead $lead): ApiResponse
    {
        Gate::authorize('delete', $lead);

        $lead->delete();

        return $this->respondDeleted('Lead deleted successfully');
    }

    /**
     * @return array<string, mixed>
     */
    private function leadData(Lead $lead): array
    {
        $lead->load(self::RELATIONS)->loadCount('orders');

        return (new LeadResource($lead))->resolve();
    }
}
