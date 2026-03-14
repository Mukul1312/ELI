/**
 * TopicEdge — entity representing a directed relationship between two CatalogTopics.
 *
 * Edge semantics:
 *   prerequisite_of : source must be learned before target
 *                     (e.g. Limits ──prerequisite_of──► Differentiation)
 *   related_to      : symmetric reinforcement; studying either helps the other
 *   applied_in      : source concept is directly applied inside target
 *                     (primary vehicle for cross-subject edges, e.g.
 *                      Math:Integration ──applied_in──► Physics:Work by Variable Force)
 *
 * Strength (only meaningful for prerequisite_of):
 *   required    — cannot meaningfully study target without source
 *   recommended — strong benefit; occasional target question solvable without it
 *   helpful     — minor boost; many students skip the ordering
 */

export type TopicEdgeType = 'prerequisite_of' | 'related_to' | 'applied_in';
export type TopicEdgeStrength = 'required' | 'recommended' | 'helpful';

export interface TopicEdgeProps {
  id: string;
  sourceTopicId: string;
  targetTopicId: string;
  edgeType: TopicEdgeType;
  /** Only set for prerequisite_of edges. */
  strength: TopicEdgeStrength | null;
  /** True when source and target belong to different subjects or exams. */
  crossSubject: boolean;
  notes: string | null;
  createdAt: Date;
}

export class TopicEdge {
  private constructor(private readonly props: TopicEdgeProps) {}

  static create(props: Omit<TopicEdgeProps, 'createdAt'>): TopicEdge {
    if (props.sourceTopicId === props.targetTopicId) {
      throw new Error('TopicEdge: source and target must be different topics');
    }
    return new TopicEdge({ ...props, createdAt: new Date() });
  }

  static reconstitute(props: TopicEdgeProps): TopicEdge {
    return new TopicEdge(props);
  }

  get id(): string { return this.props.id; }
  get sourceTopicId(): string { return this.props.sourceTopicId; }
  get targetTopicId(): string { return this.props.targetTopicId; }
  get edgeType(): TopicEdgeType { return this.props.edgeType; }
  get strength(): TopicEdgeStrength | null { return this.props.strength; }
  get crossSubject(): boolean { return this.props.crossSubject; }
  get notes(): string | null { return this.props.notes; }
  get createdAt(): Date { return this.props.createdAt; }

  toProps(): TopicEdgeProps {
    return { ...this.props };
  }
}
