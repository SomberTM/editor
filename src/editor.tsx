/* eslint-disable @typescript-eslint/no-unused-vars */
import { nanoid } from 'nanoid';
import { useCallback, useMemo, useRef, useState } from 'react';
import { cn } from './lib/utils';
import {
	Type,
	AlignLeft,
	AlignCenter,
	AlignRight,
	Bold,
	Italic,
	Strikethrough,
	Underline,
} from 'lucide-react';
import React from 'react';

type NanoId = string;

interface Position {
	x: number;
	y: number;
}

interface Size {
	width: number;
	height: number;
}

interface BaseEntity {
	id: NanoId;
	position: Position;
	size: Size;
}

interface EntityGroup extends BaseEntity {
	type: 'group';
	entityIds: Set<NanoId>;
	entities: Set<Entity>;
}

type TextFormat = 'bold' | 'italic' | 'strikethrough' | 'underline';
type TextAlign = 'left' | 'center' | 'right';
interface TextEntity extends BaseEntity {
	type: 'text';
	text: string;
	emptyText: string;
	alignment: TextAlign;
	fontSize: number;
	formatters: Set<TextFormat>;
}

interface ImageEntity extends BaseEntity {
	type: 'image';
	src: string;
}

type Entity = TextEntity | ImageEntity | EntityGroup;

function calculateMousePosition(
	element: HTMLElement,
	event: MouseEvent | React.MouseEvent<HTMLElement, MouseEvent>
): Position {
	const bounds = element.getBoundingClientRect();
	return {
		x: event.clientX - bounds.left,
		y: event.clientY - bounds.top,
	};
}

// function getWrappingTextLines(text: string, maxWidth: string);

interface Bounds {
	position: Position;
	size: Size;
}

function isWithinBounds(position: Position, bounds: Bounds) {
	return (
		position.x > bounds.position.x &&
		position.x < bounds.position.x + bounds.size.width &&
		position.y > bounds.position.y &&
		position.y < bounds.position.y + bounds.size.height
	);
}

interface EditorProps {
	width: number;
	height: number;
}

const TextEntity = React.forwardRef(
	(
		{
			entity,
			isSelected,
			className,
			onChange,
			...props
		}: Omit<React.ComponentProps<'input'>, 'onChange'> & {
			entity: TextEntity;
			isSelected: boolean;
			onChange: (entity: TextEntity) => void;
		},
		ref: React.ForwardedRef<HTMLInputElement>
	) => {
		const isEmpty = entity.text === '';
		const showEmptyText = isEmpty && !isSelected;

		return (
			<input
				{...props}
				ref={ref}
				id={entity.id}
				className={cn(
					'rounded-none outline-none',
					showEmptyText && 'outline-2 outline-gray-600',
					isSelected && 'outline-2 outline-merck',
					className
				)}
				autoFocus
				value={showEmptyText ? entity.emptyText : entity.text}
				onKeyDown={(event) => {
					if (entity.text !== '') return;

					if (event.key === 'Backspace' || event.key === 'Delete') {
						let newAlignment: TextAlign = entity.alignment;

						if (entity.alignment === 'center') newAlignment = 'left';
						else if (entity.alignment === 'right') newAlignment = 'center';

						onChange({ ...entity, alignment: newAlignment });
					}
				}}
				onChange={(event) => {
					onChange({ ...entity, text: event.target.value });
				}}
				style={{
					width: entity.size.width,
					height: entity.size.height,
					fontSize: entity.fontSize,
					textAlign: entity.alignment,
					fontWeight: entity.formatters.has('bold') ? 'bold' : 'normal',
					fontStyle: entity.formatters.has('italic') ? 'italic' : 'normal',
					textDecorationLine: entity.formatters.has('strikethrough')
						? 'line-through'
						: entity.formatters.has('underline')
						? 'underline'
						: undefined,
				}}
			/>
		);
	}
);

function stopAllPropagation(event: React.MouseEvent<HTMLElement, MouseEvent>) {
	event.stopPropagation();
	event.preventDefault();
}

export function Editor({ width, height }: EditorProps) {
	const canvasRef = useRef<HTMLDivElement>(null);
	const [entities, setEntities] = useState<Record<NanoId, Entity>>({});
	const [selectedEntityId, setSelectedEntityId] = useState<NanoId | undefined>(
		undefined
	);
	const selectedEntity = useMemo(() => {
		if (!selectedEntityId) return;
		return entities[selectedEntityId];
	}, [entities, selectedEntityId]);

	const updateSingleEntity = useCallback(
		<T extends Entity>(entityId: string, key: keyof T, value: T[keyof T]) => {
			setEntities((oldEntities) => ({
				...oldEntities,
				[entityId]: {
					...oldEntities[entityId],
					[key]: value,
				},
			}));
		},
		[]
	);

	const updateEntityPositionWithMouse = useCallback(
		(event: React.MouseEvent<HTMLElement, MouseEvent>, entity: Entity) => {
			if (!canvasRef.current) return;
			const position = calculateMousePosition(canvasRef.current, event);
			const newX = position.x - entity.size.width / 2;
			const newY = position.y - entity.size.height / 2;

			if (
				newX < 0 ||
				newY < 0 ||
				newX + entity.size.width > width ||
				newY + entity.size.height > height
			)
				return;

			updateSingleEntity(entity.id, 'position', { x: newX, y: newY });
		},
		[height, width, updateSingleEntity]
	);

	return (
		<div className="rounded-lg border border-black px-8 py-4 flex flex-col gap-2">
			<div className="border-2 border-gray-600 rounded-lg p-4 flex gap-4">
				<button
					className="w-8 h-8 border border-black rounded-lg grid place-items-center"
					onClick={() => {
						const id = nanoid();
						setEntities((e) => ({
							...e,
							[id]: {
								id,
								type: 'text',
								text: '',
								emptyText: 'Click to add text',
								alignment: 'center',
								position: {
									x: Math.max(0, Math.floor(Math.random() * width - 200)),
									y: Math.max(0, Math.floor(Math.random() * height - 20)),
								},
								size: { width: 200, height: 20 },
								fontSize: 14,
								formatters: new Set(),
							},
						}));
						setSelectedEntityId(id);
					}}
				>
					<Type size={16} />
				</button>
				<div className="flex border border-black rounded-lg items-center">
					<button
						className="w-8 h-8 grid place-items-center disabled:opacity-25 opacity-100"
						disabled={!selectedEntityId}
						onMouseDown={stopAllPropagation}
						onClick={() => {
							if (!selectedEntityId) return;
							updateSingleEntity<TextEntity>(
								selectedEntityId,
								'alignment',
								'left'
							);
						}}
					>
						<AlignLeft size={16} />
					</button>
					<button
						className="w-8 h-8 grid place-items-center disabled:opacity-25 opacity-100"
						disabled={!selectedEntityId}
						onMouseDown={stopAllPropagation}
						onClick={() => {
							if (!selectedEntityId) return;
							updateSingleEntity<TextEntity>(
								selectedEntityId,
								'alignment',
								'center'
							);
						}}
					>
						<AlignCenter size={16} />
					</button>
					<button
						className="w-8 h-8 grid place-items-center disabled:opacity-25 opacity-100"
						disabled={!selectedEntityId}
						onMouseDown={stopAllPropagation}
						onClick={() => {
							if (!selectedEntityId) return;
							updateSingleEntity<TextEntity>(
								selectedEntityId,
								'alignment',
								'right'
							);
						}}
					>
						<AlignRight size={16} />
					</button>
				</div>
				<div className="flex border border-black rounded-lg items-center">
					<button
						className={
							'w-8 h-8 grid place-items-center disabled:opacity-25 opacity-100'
						}
						disabled={!selectedEntityId}
						onMouseDown={stopAllPropagation}
						onClick={() => {
							if (!selectedEntity || selectedEntity.type !== 'text') return;
							const formatters = selectedEntity.formatters;
							if (formatters.has('bold')) formatters.delete('bold');
							else formatters.add('bold');
							updateSingleEntity<TextEntity>(
								selectedEntity.id,
								'formatters',
								new Set(formatters)
							);
						}}
					>
						<Bold
							size={16}
							strokeWidth={
								selectedEntity &&
								selectedEntity.type === 'text' &&
								selectedEntity.formatters.has('bold')
									? 3
									: 2
							}
						/>
					</button>
					<button
						className={
							'w-8 h-8 grid place-items-center disabled:opacity-25 opacity-100'
						}
						disabled={!selectedEntityId}
						onMouseDown={stopAllPropagation}
						onClick={() => {
							if (!selectedEntity || selectedEntity.type !== 'text') return;
							const formatters = selectedEntity.formatters;
							if (formatters.has('italic')) formatters.delete('italic');
							else formatters.add('italic');
							updateSingleEntity<TextEntity>(
								selectedEntity.id,
								'formatters',
								new Set(formatters)
							);
						}}
					>
						<Italic
							size={16}
							strokeWidth={
								selectedEntity &&
								selectedEntity.type === 'text' &&
								selectedEntity.formatters.has('italic')
									? 3
									: 2
							}
						/>
					</button>
					<button
						className={
							'w-8 h-8 grid place-items-center disabled:opacity-25 opacity-100'
						}
						disabled={!selectedEntityId}
						onMouseDown={stopAllPropagation}
						onClick={() => {
							if (!selectedEntity || selectedEntity.type !== 'text') return;
							const formatters = selectedEntity.formatters;
							if (formatters.has('underline')) formatters.delete('underline');
							else {
								formatters.add('underline');
								formatters.delete('strikethrough');
							}
							updateSingleEntity<TextEntity>(
								selectedEntity.id,
								'formatters',
								new Set(formatters)
							);
						}}
					>
						<Underline
							size={16}
							strokeWidth={
								selectedEntity &&
								selectedEntity.type === 'text' &&
								selectedEntity.formatters.has('underline')
									? 3
									: 2
							}
						/>
					</button>
					<button
						className={
							'w-8 h-8 grid place-items-center disabled:opacity-25 opacity-100'
						}
						disabled={!selectedEntityId}
						onMouseDown={stopAllPropagation}
						onClick={() => {
							if (!selectedEntity || selectedEntity.type !== 'text') return;
							const formatters = selectedEntity.formatters;
							if (formatters.has('strikethrough'))
								formatters.delete('strikethrough');
							else {
								formatters.add('strikethrough');
								formatters.delete('underline');
							}
							updateSingleEntity<TextEntity>(
								selectedEntity.id,
								'formatters',
								new Set(formatters)
							);
						}}
					>
						<Strikethrough
							size={16}
							strokeWidth={
								selectedEntity &&
								selectedEntity.type === 'text' &&
								selectedEntity.formatters.has('strikethrough')
									? 3
									: 2
							}
						/>
					</button>
				</div>
			</div>
			<div
				className="border border-gray-400 relative"
				style={{
					width: `${width}px`,
					height: `${height}px`,
				}}
				ref={canvasRef}
				onMouseMove={(event) => {
					if (!canvasRef.current || !selectedEntity || event.buttons !== 1)
						return;

					updateEntityPositionWithMouse(event, selectedEntity);
				}}
				onMouseDown={(event) => {
					if (!canvasRef.current) return;
					const position = calculateMousePosition(canvasRef.current, event);

					// If mouse is down on any of our entities dont set
					// selected entity to undefined
					for (const [_, entity] of Object.entries(entities)) {
						if (
							isWithinBounds(position, {
								position: entity.position,
								size: entity.size,
							})
						)
							return;
					}

					setSelectedEntityId(undefined);
				}}
			>
				{Object.entries(entities).map(([id, entity]) => {
					switch (entity.type) {
						case 'text':
							return (
								<div
									key={id}
									onMouseDown={() => setSelectedEntityId(id)}
									style={{
										position: 'absolute',
										left: entity.position.x,
										top: entity.position.y,
										width: entity.size.width,
										height: entity.size.height,
									}}
								>
									<TextEntity
										entity={entity}
										isSelected={selectedEntityId === id}
										onChange={(newEntity) =>
											setEntities((oldEntities) => ({
												...oldEntities,
												[id]: newEntity,
											}))
										}
									/>
								</div>
							);
						default:
							return <></>;
					}
				})}
			</div>
		</div>
	);
}
