document.addEventListener('DOMContentLoaded', function() {
    const lineSelect = document.getElementById('line');
    const legSelect = document.getElementById('leg');
    const machineSelect = document.getElementById('machine');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const timerDisplay = document.getElementById('timer');
    const timerSection = document.getElementById('timerSection');
    const abhSection = document.getElementById('abhSection');
    const submitAbhBtn = document.getElementById('submitAbhBtn');
    const exportBtn = document.getElementById('exportBtn');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const exportFormatSelect = document.getElementById('exportFormat');

    let startTime;
    let timerInterval;
    let currentSessionId;

    // Set default dates for export
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    startDateInput.value = lastMonth.toISOString().split('T')[0];
    endDateInput.value = today.toISOString().split('T')[0];

    // Update leg options when line changes
    lineSelect.addEventListener('change', function() {
        const selectedLine = this.value;
        legSelect.innerHTML = '<option value="">Choose a leg...</option>';
        machineSelect.innerHTML = '<option value="">Choose a machine...</option>';
        
        if (selectedLine) {
            const legs = lineConfig[selectedLine];
            Object.keys(legs).forEach(leg => {
                const option = document.createElement('option');
                option.value = leg;
                option.textContent = leg;
                legSelect.appendChild(option);
            });
            legSelect.disabled = false;
        } else {
            legSelect.disabled = true;
            machineSelect.disabled = true;
        }
    });

    // Update machine options when leg changes
    legSelect.addEventListener('change', function() {
        const selectedLine = lineSelect.value;
        const selectedLeg = this.value;
        machineSelect.innerHTML = '<option value="">Choose a machine...</option>';
        
        if (selectedLeg) {
            const machines = lineConfig[selectedLine][selectedLeg];
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

    // Start session
    document.getElementById('trackingForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const line = lineSelect.value;
        const leg = legSelect.value;
        const machine = machineSelect.value;

        try {
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    line: line,
                    leg: leg,
                    machine: machine
                })
            });

            if (response.ok) {
                const data = await response.json();
                currentSessionId = data.session_id;
                startTime = new Date();
                startTimer();
                
                // Hide form and show timer
                this.style.display = 'none';
                timerSection.classList.remove('d-none');
            } else {
                alert('Failed to start session');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while starting the session');
        }
    });

    // Stop session
    stopBtn.addEventListener('click', function() {
        clearInterval(timerInterval);
        timerSection.classList.add('d-none');
        abhSection.classList.remove('d-none');
    });

    // Submit ABH count
    submitAbhBtn.addEventListener('click', async function() {
        const abhDetected = document.getElementById('abhDetected').value;
        
        try {
            const response = await fetch(`/api/sessions/${currentSessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    abh_detected: parseInt(abhDetected)
                })
            });

            if (response.ok) {
                // Reset form and show success message
                document.getElementById('trackingForm').reset();
                document.getElementById('trackingForm').style.display = 'block';
                abhSection.classList.add('d-none');
                alert('Session completed successfully!');
            } else {
                alert('Failed to update session');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while updating the session');
        }
    });

    // Export data
    exportBtn.addEventListener('click', async function() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const format = exportFormatSelect.value;

        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        try {
            const response = await fetch(`/api/export?start_date=${startDate}&end_date=${endDate}&format=${format}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `work_sessions.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                alert('Failed to export data');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while exporting data');
        }
    });

    function startTimer() {
        timerInterval = setInterval(() => {
            const now = new Date();
            const diff = now - startTime;
            
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }
}); 