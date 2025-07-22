document.addEventListener('DOMContentLoaded', function() {
    // Elementos da UI
    const currentDateElement = document.getElementById('current-date');
    const dayViewBtn = document.getElementById('day-view');
    const weekViewBtn = document.getElementById('week-view');
    const monthViewBtn = document.getElementById('month-view');
    const dayView = document.querySelector('.day-view');
    const weekView = document.querySelector('.week-view');
    const monthView = document.querySelector('.month-view');
    const openTaskFormBtn = document.getElementById('open-task-form');
    const taskFormModal = document.getElementById('task-form-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const taskForm = document.getElementById('task-form');
    const dailyTasksList = document.getElementById('daily-tasks');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const monthYearElement = document.getElementById('month-year');
    const timeSlotsContainer = document.querySelector('.time-slots');
    const filterPeriodSelect = document.getElementById('filter-period');
    const filterDateInput = document.getElementById('filter-date');
    const filterTimeSelect = document.getElementById('filter-time');
    const taskTypeSelect = document.getElementById('task-type');
    const taskDateGroup = document.getElementById('task-date-group');

    // Estado da aplicação
    let currentDate = new Date();
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // Inicialização
    updateDateDisplay();
    renderDayView();
    renderWeekView();
    renderMonthView();
    setupEventListeners();

    function setupEventListeners() {
        dayViewBtn.addEventListener('click', () => switchView('day'));
        weekViewBtn.addEventListener('click', () => switchView('week'));
        monthViewBtn.addEventListener('click', () => switchView('month'));
        
        openTaskFormBtn.addEventListener('click', openTaskForm);
        modalCloseBtn.addEventListener('click', closeTaskForm);
        window.addEventListener('click', (e) => {
            if (e.target === taskFormModal) {
                closeTaskForm();
            }
        });
        
        taskForm.addEventListener('submit', handleTaskSubmit);
        
        prevMonthBtn.addEventListener('click', goToPreviousMonth);
        nextMonthBtn.addEventListener('click', goToNextMonth);
        
        filterPeriodSelect.addEventListener('change', function() {
            filterDateInput.classList.toggle('hidden', this.value !== 'custom');
            renderDayView();
        });
        
        filterDateInput.addEventListener('change', function() {
            currentDate = new Date(this.value);
            updateDateDisplay();
            renderDayView();
        });
        
        filterTimeSelect.addEventListener('change', renderDayView);
        
        taskTypeSelect.addEventListener('change', function() {
            taskDateGroup.style.display = this.value === 'daily' ? 'none' : 'block';
        });
    }

    function updateDateDisplay() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateElement.textContent = currentDate.toLocaleDateString('pt-BR', options);
        monthYearElement.textContent = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        filterDateInput.value = formatDate(currentDate);
    }

    function switchView(view) {
        dayViewBtn.classList.remove('active');
        weekViewBtn.classList.remove('active');
        monthViewBtn.classList.remove('active');
        
        dayView.classList.add('hidden');
        weekView.classList.add('hidden');
        monthView.classList.add('hidden');
        
        if (view === 'day') {
            dayViewBtn.classList.add('active');
            dayView.classList.remove('hidden');
            renderDayView();
        } else if (view === 'week') {
            weekViewBtn.classList.add('active');
            weekView.classList.remove('hidden');
            renderWeekView();
        } else if (view === 'month') {
            monthViewBtn.classList.add('active');
            monthView.classList.remove('hidden');
            renderMonthView();
        }
    }

    function renderDayView() {
        let displayDate = currentDate;
        if (filterPeriodSelect.value === 'custom' && filterDateInput.value) {
            displayDate = new Date(filterDateInput.value);
        }
        
        const formattedDate = formatDate(displayDate);
        renderDailyTasks(displayDate);
    }

    function getTasksForDate(date) {
        const formattedDate = formatDate(date);
        
        return tasks.map(task => {
            // Para tarefas diárias, criamos uma cópia com a data atual
            if (task.daily) {
                return {
                    ...task,
                    date: formattedDate,
                    isDaily: true
                };
            }
            // Para tarefas específicas, retornamos apenas se a data coincidir
            if (task.date === formattedDate) {
                return {
                    ...task,
                    isDaily: false
                };
            }
            return null;
        }).filter(task => task !== null);
    }

    function renderDailyTasks(date) {
        dailyTasksList.innerHTML = '';
        const dailyTasks = getTasksForDate(date);
        
        const timeFilter = filterTimeSelect.value;
        const filteredTasks = dailyTasks.filter(task => {
            if (timeFilter === 'all') return true;
            if (!task.time) return false;
            
            const hour = parseInt(task.time.split(':')[0]);
            
            if (timeFilter === 'morning') return hour >= 5 && hour < 12;
            if (timeFilter === 'afternoon') return hour >= 12 && hour < 18;
            if (timeFilter === 'evening') return hour >= 18 && hour <= 23;
            return false;
        });
        
        if (filteredTasks.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = 'Nenhuma tarefa para este dia.';
            dailyTasksList.appendChild(emptyMessage);
        } else {
            filteredTasks.forEach((task, index) => {
                const originalTaskIndex = tasks.findIndex(t => t.id === task.id);
                const taskItem = document.createElement('li');
                taskItem.className = `task-item ${task.isDaily ? 'daily' : ''} ${isTaskCompletedForDate(task, date) ? 'completed' : ''}`;
                
                const taskInfo = document.createElement('div');
                taskInfo.innerHTML = `
                    <strong>${task.title}</strong>
                    ${task.description ? `<p>${task.description}</p>` : ''}
                    ${task.time ? `<small>${task.time}</small>` : ''}
                `;
                
                const taskActions = document.createElement('div');
                taskActions.className = 'task-actions';
                
                const completeBtn = document.createElement('button');
                completeBtn.innerHTML = '<i class="fas fa-check"></i>';
                completeBtn.title = 'Marcar como concluída';
                completeBtn.addEventListener('click', () => toggleTaskComplete(originalTaskIndex, date));
                
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.title = 'Excluir tarefa';
                deleteBtn.addEventListener('click', () => deleteTask(originalTaskIndex));
                
                taskActions.appendChild(completeBtn);
                taskActions.appendChild(deleteBtn);
                
                taskItem.appendChild(taskInfo);
                taskItem.appendChild(taskActions);
                dailyTasksList.appendChild(taskItem);
            });
        }
    }

    function isTaskCompletedForDate(task, date) {
        if (task.daily) {
            if (!task.completedDates) return false;
            return task.completedDates.includes(formatDate(date));
        }
        return task.completed;
    }

    function renderWeekView() {
        const weekDaysContainer = document.querySelector('.week-days');
        weekDaysContainer.innerHTML = '';
        
        const firstDayOfWeek = new Date(currentDate);
        firstDayOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(firstDayOfWeek);
            day.setDate(firstDayOfWeek.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'week-day';
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'week-day-header';
            dayHeader.textContent = day.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
            
            dayElement.appendChild(dayHeader);
            
            const dayTasks = getTasksForDate(day);
            
            if (dayTasks.length > 0) {
                const tasksList = document.createElement('ul');
                tasksList.style.listStyle = 'none';
                
                dayTasks.slice(0, 3).forEach(task => {
                    const taskItem = document.createElement('li');
                    taskItem.textContent = task.time ? `${task.time} - ${task.title}` : task.title;
                    if (task.isDaily) {
                        taskItem.innerHTML = '🔄 ' + taskItem.textContent;
                    }
                    tasksList.appendChild(taskItem);
                });
                
                if (dayTasks.length > 3) {
                    const moreItem = document.createElement('li');
                    moreItem.textContent = `+${dayTasks.length - 3} mais`;
                    tasksList.appendChild(moreItem);
                }
                
                dayElement.appendChild(tasksList);
            }
            
            if (day.toDateString() === new Date().toDateString()) {
                dayElement.style.borderColor = 'var(--primary-color)';
                dayElement.style.backgroundColor = 'var(--task-color)';
            }
            
            weekDaysContainer.appendChild(dayElement);
        }
    }

    function renderMonthView() {
        const monthCalendarContainer = document.querySelector('.month-calendar');
        monthCalendarContainer.innerHTML = '';
        
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDay = firstDay.getDay();
        
        const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            const dayElement = createMonthDayElement(prevMonthLastDay - i, true);
            monthCalendarContainer.appendChild(dayElement);
        }
        
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dayElement = createMonthDayElement(i, false);
            
            const today = new Date();
            if (i === today.getDate() && 
                currentDate.getMonth() === today.getMonth() && 
                currentDate.getFullYear() === today.getFullYear()) {
                dayElement.classList.add('today');
            }
            
            monthCalendarContainer.appendChild(dayElement);
        }
        
        const totalCells = Math.ceil((startDay + lastDay.getDate()) / 7) * 7;
        const remainingCells = totalCells - (startDay + lastDay.getDate());
        for (let i = 1; i <= remainingCells; i++) {
            const dayElement = createMonthDayElement(i, true);
            monthCalendarContainer.appendChild(dayElement);
        }
    }

    function createMonthDayElement(day, isOtherMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = `month-day ${isOtherMonth ? 'other-month' : ''}`;
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'month-day-header';
        dayHeader.textContent = day;
        dayElement.appendChild(dayHeader);
        
        if (!isOtherMonth) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayTasks = getTasksForDate(date);
            
            if (dayTasks.length > 0) {
                const tasksList = document.createElement('ul');
                tasksList.style.listStyle = 'none';
                tasksList.style.fontSize = '0.8rem';
                
                dayTasks.slice(0, 2).forEach(task => {
                    const taskItem = document.createElement('li');
                    let taskText = task.title.length > 10 ? task.title.substring(0, 10) + '...' : task.title;
                    if (task.isDaily) {
                        taskText = '🔄 ' + taskText;
                    }
                    taskItem.textContent = taskText;
                    tasksList.appendChild(taskItem);
                });
                
                if (dayTasks.length > 2) {
                    const moreItem = document.createElement('li');
                    moreItem.textContent = `+${dayTasks.length - 2} mais`;
                    tasksList.appendChild(moreItem);
                }
                
                dayElement.appendChild(tasksList);
            }
        }
        
        return dayElement;
    }

    function goToPreviousMonth() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateDateDisplay();
        renderMonthView();
    }

    function goToNextMonth() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateDateDisplay();
        renderMonthView();
    }

    function openTaskForm() {
        taskFormModal.classList.add('visible');
        document.body.style.overflow = 'hidden';
        document.getElementById('task-date').value = formatDate(currentDate);
        document.getElementById('task-title').focus();
    }

    function closeTaskForm() {
        taskFormModal.classList.remove('visible');
        document.body.style.overflow = 'auto';
        taskForm.reset();
    }

    function handleTaskSubmit(e) {
        e.preventDefault();
        
        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const date = document.getElementById('task-date').value;
        const time = document.getElementById('task-time').value;
        const type = document.getElementById('task-type').value;
        
        if (!title) {
            alert('Por favor, insira um título para a tarefa');
            return;
        }

        const newTask = {
            id: Date.now(),
            title,
            description,
            time,
            completed: false
        };
        
        if (type === 'specific') {
            newTask.date = date;
            newTask.daily = false;
        } else {
            newTask.daily = true;
        }
        
        tasks.push(newTask);
        saveTasks();
        updateCurrentView();
        closeTaskForm();
    }

    function toggleTaskComplete(index, date) {
        const task = tasks[index];
        
        if (task.daily) {
            if (!task.completedDates) {
                task.completedDates = [];
            }
            
            const formattedDate = formatDate(date);
            const dateIndex = task.completedDates.indexOf(formattedDate);
            
            if (dateIndex === -1) {
                task.completedDates.push(formattedDate);
            } else {
                task.completedDates.splice(dateIndex, 1);
            }
        } else {
            task.completed = !task.completed;
        }
        
        saveTasks();
        updateCurrentView();
    }

    function deleteTask(index) {
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            tasks.splice(index, 1);
            saveTasks();
            updateCurrentView();
        }
    }

    function updateCurrentView() {
        if (dayViewBtn.classList.contains('active')) {
            renderDayView();
        } else if (weekViewBtn.classList.contains('active')) {
            renderWeekView();
        } else if (monthViewBtn.classList.contains('active')) {
            renderMonthView();
        }
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
});