import { ValueObject } from '../../shared/value-object';
import type { Mode } from '../../loop-health/loop-health-snapshot';

interface PlaySelectionProps {
  playId: string;
  mode: Mode;
  protocol: 1 | 2 | 3;
  name: string;
  description: string;
}

export class PlaySelection extends ValueObject<PlaySelectionProps> {
  private constructor(props: PlaySelectionProps) {
    super(props);
  }

  static create(
    playId: string,
    mode: Mode,
    protocol: 1 | 2 | 3,
    name: string,
    description: string
  ): PlaySelection {
    return new PlaySelection({ playId, mode, protocol, name, description });
  }

  get playId(): string { return this.props.playId; }
  get mode(): Mode { return this.props.mode; }
  get protocol(): 1 | 2 | 3 { return this.props.protocol; }
  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
}
