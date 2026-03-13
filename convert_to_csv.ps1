try {
    $excel = New-Object -ComObject Excel.Application
    $workbook = $excel.Workbooks.Open('C:\Users\Usuario\Documents\SaveOrEliminate\ListasDeezer.xlsx')
    $worksheet = $workbook.Sheets(1)
    
    # Save as CSV
    $csvPath = 'C:\Users\Usuario\Documents\SaveOrEliminate\ListasDeezer.csv'
    $worksheet.SaveAs($csvPath, 6)  # 6 = CSV format
    
    Write-Host "Converted to CSV: $csvPath"
    
    $workbook.Close()
    $excel.Quit()
} catch {
    Write-Host "Error: $_"
}
