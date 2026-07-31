describe('ระบบยืม-คืนพัสดุ UI Tests', () => {
  beforeEach(() => {
    cy.visit('https://fsg07.cpecmu.com/'); 
  });

  it('ควรแสดงหัวข้อระบบและเมนูหลักได้อย่างถูกต้อง', () => {
    cy.contains('ระบบยืมของ - สโมสรนักศึกษาคณะวิศวกรรมศาสตร์').should('be.visible');
    
    cy.contains('บริการยืมของ').should('be.visible');
    cy.contains('ประวัติยืม - คืน').should('be.visible'); 
  });

  it('ควรเปิด Modal เพิ่มพัสดุใหม่ได้ เมื่อกดปุ่ม', () => {
    cy.contains('เพิ่มพัสดุใหม่').click();
    
    cy.contains('รหัสสิ่งของ').should('be.visible');
    cy.contains('บันทึกข้อมูล').should('be.visible');
    
    cy.get('.btn-close').click();
  });

  it('ควรสามารถสลับไปยังแท็บประวัติการยืม-คืนได้', () => {
    cy.contains('ประวัติยืม - คืน').click();
    
    cy.contains('รหัสนักศึกษา').should('be.visible');
    cy.contains('วัน-เวลายืม').should('be.visible');
  });
});