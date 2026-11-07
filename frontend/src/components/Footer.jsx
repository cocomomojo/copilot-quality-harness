export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="footer">
      <p>&copy; {currentYear} Copilot Quality Harness. All rights reserved.</p>
    </footer>
  );
}
