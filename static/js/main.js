document.addEventListener('DOMContentLoaded', function() {
    const lineSelect = document.getElementById('line');
    const legSelect = document.getElementById('leg');
    const machineSelect = document.getElementById('machine');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const timerSection = document.getElementById('timerSection');
    const timerDisplay = document.getElementById('timer');
    const exportBtn = document.getElementById('exportBtn');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const exportFormatSelect = document.getElementById('exportFormat');

    let currentSessionId = null;
    let timerInterval = null;
    let startTime = null;

    // Set default dates for export
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    startDateInput.value = lastMonth.toISOString().split('T')[0];
    endDateInput.value = today.toISOString().split('T')[0];

    // Update leg options when line is selected
    lineSelect.addEventListener('change', function() {
        const selectedLine = this.value;
        legSelect.innerHTML = '<option value="">Choose a leg...</option>';
        machineSelect.innerHTML = '<option value="">Choose a machine...</option>';
        
        if (selectedLine) {
            const legs = lineConfig[selectedLine].legs;
            legs.forEach(leg => {
                const option = document.createElement('option');
                option.value = leg;
                option.textContent = leg;
                legSelect.appendChild(option);
            });
            legSelect.disabled = false;
            machineSelect.disabled = true;
        } else {
            legSelect.disabled = true;
            machineSelect.disabled = true;
        }
    });

    // Update machine options when leg is selected
    legSelect.addEventListener('change', function() {
        const selectedLine = lineSelect.value;
        machineSelect.innerHTML = '<option value="">Choose a machine...</option>';
        
        if (selectedLine) {
            const machines = lineConfig[selectedLine].machines;
            machines.forEach(machine => {
                const option = document.createElement('option');
                option.value = machine;
                option.textContent = machine;
                machineSelect.appendChild(option);
            });
            machineSelect.disabled = false;
        } else {
            machineSelect.disabled = true;
        }
    });

    // Start timer
    startBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const data = {
            line: lineSelect.value,
            leg: legSelect.value,
            machine: machineSelect.value
        };

        try {
            const response = await fetch('/api/start_session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to start session');
            }

            const result = await response.json();
            currentSessionId = result.session_id;
            
            // Start timer
            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);
            
            // Show timer section
            timerSection.classList.remove('d-none');
            startBtn.disabled = true;
            lineSelect.disabled = true;
            legSelect.disabled = true;
            machineSelect.disabled = true;
        } catch (error) {
            console.error('Error starting session:', error);
            alert('Error starting session. Please try again.');
        }
    });

    // Stop timer
    stopBtn.addEventListener('click', async function() {
        if (!currentSessionId) return;

        try {
            const response = await fetch('/api/stop_session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ session_id: currentSessionId })
            });

            if (!response.ok) {
                throw new Error('Failed to stop session');
            }

            const result = await response.json();
            
            // Stop timer
            clearInterval(timerInterval);
            
            // Reset form
            timerSection.classList.add('d-none');
            startBtn.disabled = false;
            lineSelect.disabled = false;
            lineSelect.value = '';
            legSelect.value = '';
            machineSelect.value = '';
            currentSessionId = null;
        } catch (error) {
            console.error('Error stopping session:', error);
            alert('Error stopping session. Please try again.');
        }
    });

    // Update timer display
    function updateTimer() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const totalMinutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        timerDisplay.textContent = `${String(totalMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Export data
    exportBtn.addEventListener('click', async function() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const format = exportFormatSelect.value;

        if (!startDate || !endDate) {
            alert('Please select both start and end dates.');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('Start date cannot be after end date.');
            return;
        }

        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';

        try {
            const response = await fetch('/api/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    start_date: startDate,
                    end_date: endDate,
                    format: format
                })
            });

            const contentType = response.headers.get('content-type');
            
            if (response.ok && (contentType.includes('spreadsheetml') || contentType.includes('csv'))) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.headers.get('content-disposition').split('filename=')[1] || 
                           `cil_sessions_${startDate}_${endDate}.${format === 'excel' ? 'xlsx' : 'csv'}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Export failed');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            alert(error.message || 'Error exporting data. Please try again.');
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export Data';
        }
    });
}); 