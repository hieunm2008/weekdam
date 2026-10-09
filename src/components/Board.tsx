import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useSensors, useSensor, useDroppable, closestCenter, type KeyboardCoordinateGetter, type CollisionDetection } from '@dnd-kit/core';
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Plus, CalendarClock } from 'lucide-react';
import { shiftDate, type Project, type Task, type Subtask } from '../domain';
import { useDndAccessibility } from './dndAccessibility';

interface Row {project:Project;task:Task;step:Subtask;missed:boolean;displayDay:number}
const rowsFor=(projects:Project[],day:number):Row[]=>projects.flatMap(project=>project.tasks.flatMap(task=>task.subtasks.filter(s=>s.day===day||s.missed.includes(day)).map(step=>({project,task,step,missed:step.day!==day,displayDay:day}))));
const keyboardCoordinates:KeyboardCoordinateGetter=(event,args)=>{
  if(args.context.active?.data.current?.type==='step'&&['ArrowLeft','ArrowRight'].includes(event.code)){
    const currentDay=Number(args.context.over?.data.current?.day??args.context.active.data.current.day);const target=Math.max(0,Math.min(6,currentDay+(event.code==='ArrowRight'?1:-1)));
    const rect=args.context.droppableRects.get('day-'+target)??args.context.droppableRects.get('tab-day-'+target);const active=args.context.active.rect.current.translated;
    if(rect&&active){event.preventDefault();return {x:rect.left+rect.width/2-active.width/2,y:rect.top+Math.min(90,rect.height/2-active.height/2)};}
  }
  return sortableKeyboardCoordinates(event,args);
};
// A tall empty column must outrank a shorter card in the original column.
const boardCollision:CollisionDetection=args=>{
  const x=args.pointerCoordinates?.x??args.collisionRect.left+args.collisionRect.width/2;
  const y=args.pointerCoordinates?.y??args.collisionRect.top+args.collisionRect.height/2;
  const day=args.droppableContainers.find(container=>{const rect=args.droppableRects.get(container.id);return container.data.current?.type==='day'&&rect&&x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;});
  if(!day)return [];
  const steps=args.droppableContainers.filter(c=>c.data.current?.type==='step'&&c.data.current.day===day.data.current?.day&&c.id!==args.active.id);
  return steps.length?closestCenter({...args,droppableContainers:steps}):[{id:day.id,data:{droppableContainer:day,value:0}}];
};
function Card({row,ended,onCheck,onEdit,onMove,onClearMissed,overdue}:{row:Row;ended:boolean;onCheck:()=>void;onEdit:()=>void;onMove:()=>void;onClearMissed:()=>void;overdue:boolean}) {
  const {t}=useTranslation();const drag=useSortable({id:row.missed?'history-'+row.step.id+'-'+row.displayDay:row.step.id,disabled:ended||row.missed,data:{type:'step',day:row.step.day}});
  return <article ref={drag.setNodeRef} className={'work-card'+(row.step.done&&!row.missed?' is-done':'')+(row.missed?' is-missed':'')} style={{transform:CSS.Transform.toString(drag.transform),transition:drag.transition,opacity:drag.isDragging?.3:1}}>
    <div className="card-top"><span className="project-tag">{row.project.name}</span><span className={'weight weight-'+row.step.weight} aria-label={t('difficulty')+': '+t(['easy','medium','hard'][row.step.weight-1])}>{[1,2,3].map(i=><i key={i} className={i<=row.step.weight?'filled':''}/>)}</span></div>
    <div className="card-title"><label className="check-target"><input type="checkbox" aria-label={row.task.name} checked={row.step.done&&!row.missed} disabled={ended||row.missed} onChange={onCheck}/></label><button className="task-title" aria-label={t('editTask',{name:row.task.name})} onClick={onEdit}>{row.task.name}</button></div>
    {row.step.note?<p className="step-note">{row.step.note}</p>:null}
    {row.missed?<span className="missed-label">{t('missed')}</span>:overdue?<span className="overdue-label"><CalendarClock size={13}/>{t('overdue')}</span>:null}
    {!ended?<div className="card-actions">{row.missed?<button className="text-button" onClick={onClearMissed}>{t('clearMissed')}</button>:<><button className="drag-handle" aria-label={t('drag')} {...drag.attributes} {...drag.listeners}><GripVertical size={17}/></button><button className="icon-button" aria-label={t('moveDay')} onClick={onMove}><MoreHorizontal size={19}/></button></>}</div>:null}
  </article>;
}
function Day({day,start,projects,ended,todayDate,onCheck,onEdit,onMove,onAdd,onClearMissed}:{day:number;start:string;projects:Project[];ended:boolean;todayDate:string;onCheck:(s:string)=>void;onEdit:(t:Task,p:string)=>void;onMove:(s:string)=>void;onAdd:(day:number)=>void;onClearMissed:(s:string,day:number)=>void}) {
  const {t}=useTranslation();const drop=useDroppable({id:'day-'+day,data:{type:'day',day},disabled:ended});const rows=rowsFor(projects,day),real=rows.filter(r=>!r.missed),done=real.filter(r=>r.step.done).length,date=shiftDate(start,day);
  return <section ref={drop.setNodeRef} className={'day-column'+(date===todayDate?' today':'')+(drop.isOver?' drop-target':'')} data-day={day}>
    <header className="day-head"><div><h3>{t('mobileShort').split(',')[day]}</h3><span className="date-number">{Number(date.slice(-2))}</span></div><span className="day-total">{done}/{real.length}</span></header>
    <SortableContext items={real.map(r=>r.step.id)} strategy={verticalListSortingStrategy}><div className="day-cards">{rows.map(row=><Card key={row.step.id+(row.missed?'-missed-'+day:'')} row={row} ended={ended} overdue={!row.step.done&&date<todayDate} onCheck={()=>onCheck(row.step.id)} onEdit={()=>onEdit(row.task,row.project.id)} onMove={()=>onMove(row.step.id)} onClearMissed={()=>onClearMissed(row.step.id,day)}/>)}</div></SortableContext>
    {!rows.length?<p className="empty-day">{t('emptyDay')}</p>:null}
    {!ended?<button className="add-day" aria-label={t('newTask')+' · '+t('dayNames').split(',')[day]} onClick={()=>onAdd(day)}><Plus size={16}/><span>{t('newTask')}</span></button>:null}
  </section>;
}
function DayTarget({day,start,selected,onSelect}:{day:number;start:string;selected:boolean;onSelect:()=>void}){
  const {t}=useTranslation(),drop=useDroppable({id:'tab-day-'+day,data:{type:'day',day}});
  return <button ref={drop.setNodeRef} className={(selected?'selected ':'')+(drop.isOver?'drop-target':'')} aria-label={t('dayNames').split(',')[day]} aria-pressed={selected} onClick={onSelect}>{t('mobileShort').split(',')[day]}<span>{Number(shiftDate(start,day).slice(-2))}</span></button>;
}
export function Board(props:Omit<Parameters<typeof Day>[0],'day'> & {focus:number|null;mobile?:boolean;onFocus?:(day:number)=>void;onDrop:(id:string,day:number,beforeId?:string)=>void}) {
  const [active,setActive]=useState<string|null>(null);const sensors=useSensors(useSensor(MouseSensor,{activationConstraint:{distance:8}}),useSensor(TouchSensor,{activationConstraint:{delay:250,tolerance:8}}),useSensor(KeyboardSensor,{coordinateGetter:keyboardCoordinates}));
  const activeRow=props.projects.flatMap(p=>p.tasks.flatMap(t=>t.subtasks.map(s=>({p,t,s})))).find(r=>r.s.id===active);
  const accessibility=useDndAccessibility();
  return <DndContext accessibility={accessibility} sensors={sensors} collisionDetection={boardCollision} onDragStart={({active})=>setActive(String(active.id))} onDragCancel={()=>setActive(null)} onDragEnd={({active,over})=>{setActive(null);if(over&&over.data.current){const day=Number(over.data.current.day);props.onDrop(String(active.id),day,over.data.current.type==='step'?String(over.id):undefined);if(props.mobile)props.onFocus?.(day);}}}>
    {props.mobile?<div className="day-tabs">{Array.from({length:7},(_,day)=><DayTarget key={day} day={day} start={props.start} selected={props.focus===day} onSelect={()=>props.onFocus?.(day)}/>)}</div>:null}
    <div className={'week-grid'+(props.focus!==null?' focused':'')} data-testid="day-work">{Array.from({length:7},(_,day)=>props.focus===null||props.focus===day?<Day key={day} {...props} day={day}/>:null)}</div>
    <DragOverlay>{activeRow?<div className="drag-preview"><span>{activeRow.p.name}</span><strong>{activeRow.t.name}</strong></div>:null}</DragOverlay>
  </DndContext>;
}
