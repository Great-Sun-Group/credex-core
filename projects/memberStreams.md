# Member Data Streams: Core Transaction Engine Plan

## Overview

This plan outlines the architecture for a unified member-centric data stream system that can handle any type of member data (eg. transactions, interactions, biometrics, environmental) through a single, extensible API. The system treats all member devices as part of a cohesive network managed through one API.

## Current Architecture Assessment

**Existing Strengths:**
- Clean domain/infrastructure/presentation layered architecture
- Repository pattern with Either<Failure, T> error handling
- BLoC state management with event-driven patterns
- Centralized DashboardService for shared state
- Automatic JWT token refresh and authentication
- Comprehensive logging and network monitoring

**Gaps for Member Data Streams:**
- Single-purpose APIs (createCredex, getCredex, etc.)
- No unified data stream concept
- Transaction-focused rather than extensible data-focused
- Hard-coded entity structures

## Core Architecture

### 1. Unified Member Data Stream API

Replace single-purpose endpoints with stream-based data ingestion:

```typescript
// New API endpoints
POST /api/member/{memberId}/streams/{streamId}/data
GET  /api/member/{memberId}/state?streams=interactions,transactions&since=2025-11-01
```

### 2. Extensible Data Schema

Flexible data model supporting any data type:

```dart
class MemberDataStream {
  final String memberId;
  final String streamId; // "interactions", "transactions", "biometrics"
  final String deviceId;
  final DateTime timestamp;
  final Map<String, dynamic> data;
  final int version;

  const MemberDataStream({
    required this.memberId,
    required this.streamId,
    required this.deviceId,
    required this.timestamp,
    required this.data,
    required this.version,
  });
}

class MemberState {
  final String memberId;
  final DateTime lastSync;
  final Map<String, StreamState> streams;

  const MemberState({
    required this.memberId,
    required this.lastSync,
    required this.streams,
  });
}
```

### 3. Transaction Engine BLoC

Extend existing BLoC pattern for unified data handling:

```dart
class MemberDataBloc extends Bloc<MemberDataEvent, MemberDataState> {
  final MemberDataRepository repository;

  MemberDataBloc(this.repository) : super(MemberDataInitial()) {
    on<SubmitDataEvent>(_handleDataSubmission);
    on<FetchStateEvent>(_handleStateFetch);
  }

  Future<void> _handleDataSubmission(
    SubmitDataEvent event,
    Emitter<MemberDataState> emit,
  ) async {
    emit(MemberDataSubmitting());

    final result = await repository.submitData(
      streamId: event.streamId,
      deviceId: event.deviceId,
      data: event.data,
    );

    result.fold(
      (failure) => emit(MemberDataError(failure.message)),
      (success) => emit(MemberDataSubmitted()),
    );
  }
}
```

### 4. Repository Interface

New repository abstraction for data streams:

```dart
abstract class MemberDataRepository {
  Future<Either<Failure, bool>> submitData({
    required String streamId,
    required String deviceId,
    required Map<String, dynamic> data,
  });

  Future<Either<Failure, MemberState>> getState({
    required List<String> streams,
    DateTime? since,
  });
}
```

## Implementation Roadmap

### Phase 1: Foundation (2-3 weeks)
1. Create unified data entities (MemberDataStream, MemberState)
2. Build MemberDataRepository interface and implementation
3. Add stream-based API endpoints for data ingestion
4. Implement basic MemberDataBloc for state management

### Phase 2: Integration (2-3 weeks)
1. Migrate existing transaction APIs to use stream system
2. Add interaction data tracking (screen views, clicks, time spent)
3. Extend client BLoC patterns for new data types
4. Update existing repositories to use new stream architecture

### Phase 3: Advanced Features (3-4 weeks)
1. Add data validation per stream type
2. Implement analytics pipeline for member data
3. Add privacy controls and data access management
4. Performance optimizations (caching, batching)

## Migration Strategy

**Maintain Backward Compatibility:**
- Keep existing APIs functional during transition
- Gradually migrate features to new stream-based system
- Preserve existing BLoC patterns alongside new architecture

**Incremental Adoption:**
- Start with interaction data (initial focus)
- Migrate transaction data to streams
- Expand to additional data types as needed
- Achieve full member data unification

## Key Benefits

1. **Unified API**: Single interface for all member data types
2. **Extensible**: Easy to add new data streams without API changes
3. **Type-Safe**: Strong typing with Dart entities
4. **Consistent**: Same patterns for all data operations
5. **Scalable**: Architecture supports future data type expansions
6. **Maintainable**: Clean separation of concerns and modular design

This foundation provides the extensible architecture needed for comprehensive member data storage while maintaining current application stability.

## Streams vs Devices: Scalable Architecture Logic

The relationship between streams and devices is fundamental to this extensible architecture, working together to scale from personal devices to industrial systems:

### Core Logic: Streams as Data Categories, Devices as Data Sources

**Streams (What Data):**
Streams are categories of member data that flow through the system:
- `interactions` - UI interactions, screen views, clicks
- `transactions` - Financial operations, credex movements
- `biometrics` - Health data, vital signs, activity
- `environmental` - Location, temperature, air quality
- `device` - Battery, connectivity, system health
- `custom` - Extensible for any future data type

**Devices (Where Data Comes From):**
Devices are registered sources that can publish to multiple streams:
- Mobile phones, tablets, wearables
- Smart home devices (thermostats, cameras, locks)
- Vehicles (cars, bikes, scooters)
- Robotics and automation systems
- Industrial equipment and production lines

### Device-Stream Relationship Logic

**1. Device Registry & Capabilities:**
Each device registers with the system declaring its capabilities - which streams it can publish to and what data structures it sends.

**2. Stream Routing Logic:**
When a device sends data, the system routes it based on stream subscriptions, allowing flexible data flow from any device to any relevant stream processor.

**3. Multi-Device Stream Aggregation:**
Streams can aggregate data from multiple devices, creating unified views (e.g., complete health picture from phone, watch, scale, and blood pressure monitor).

### Scaling to Hundreds of Devices

**Device Hierarchy & Grouping:**
For large-scale deployments, devices are organized hierarchically:
- Personal Devices (phones, wearables)
- Home Environment (thermostats, cameras, appliances)
- Transportation (cars, bikes, scooters)
- Robotics & Automation (personal assistants, home robots)
- Industrial/Production (manufacturing equipment, assembly lines)

**Stream Processing at Scale:**
- Stream filtering and prioritization based on device types and data importance
- Edge processing for critical data, batch processing for non-critical data
- Stream sharding across multiple processors for large-scale operations

### Use Case Examples

**Personal Health Ecosystem (10-20 devices):**
Aggregate health data from phone, watch, scale, and monitors into unified member health profile.

**Smart Home Management (50+ devices):**
Coordinate thermostats, cameras, locks, and appliances based on member presence and preferences.

**Autonomous Vehicle Integration (5-10 devices):**
Vehicle systems respond to driver biometrics and handle payments automatically.

**Personal Robotics (20-50 devices):**
Robots coordinate activities based on member schedule and health data.

**Production Line Management (100+ devices):**
Complete production tracking with predictive maintenance across assembly robots, quality sensors, and monitoring equipment.

### Key Architectural Principles

**1. Device Autonomy with Central Coordination:**
Devices operate independently but report to central member state, with graceful degradation when devices go offline.

**2. Stream-Based Data Flow:**
All data flows through typed streams regardless of source, enabling consistent processing pipelines.

**3. Member-Centric Aggregation:**
All device data aggregates to single member context with privacy controls applied at member level.

**4. Scalable Processing:**
Horizontal scaling of stream processors with event-driven real-time processing and batch analytics.

This architecture scales naturally from personal use to industrial applications because the core logic remains the same: **devices publish to streams, streams get processed and aggregated, all centered around member context and preferences**.
